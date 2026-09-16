import test from 'node:test';
import assert from 'node:assert/strict';
import { copyContactEmail } from '../../features/portfolio/contact-clipboard.ts';

function fixture(command) {
  const input = {
    selectionStart: 2,
    selectionEnd: 6,
    selectionDirection: 'backward',
    focus(options) {
      assert.equal(options.preventScroll, true);
      doc.activeElement = this;
    },
    setSelectionRange(...range) {
      this.restored = range;
    },
  };
  const field = {
    style: {},
    setAttribute() {},
    focus() {
      doc.activeElement = this;
    },
    select() {
      this.selected = true;
    },
    remove() {
      this.removed = true;
    },
  };
  const doc = {
    activeElement: input,
    getSelection: () => null,
    createElement: () => field,
    body: { appendChild() {} },
    execCommand(name) {
      assert.equal(name, 'copy');
      assert.equal(field.selected, true);
      return command();
    },
  };
  return { doc, input, field };
}

test('The first click copies synchronously and restores field focus and selection', async () => {
  const { doc, input, field } = fixture(() => true);
  let asynchronous = 0;
  const result = copyContactEmail('hello@example.com', doc, {
    writeText: async () => {
      asynchronous++;
    },
  });
  assert.equal(field.value, 'hello@example.com');
  assert.equal(
    field.removed,
    true,
    'Temporary DOM is already removed before awaiting',
  );
  assert.equal(doc.activeElement, input);
  assert.deepEqual(input.restored, [2, 6, 'backward']);
  assert.equal(await result, true);
  assert.equal(asynchronous, 0);
});

test('Modern copying starts in the same gesture if the compatibility path is unsupported', async () => {
  for (const command of [
    () => false,
    () => {
      throw new Error('Unsupported');
    },
  ]) {
    const { doc, input, field } = fixture(command);
    let invoked = false;
    const result = copyContactEmail('hello@example.com', doc, {
      writeText(text) {
        invoked = true;
        assert.equal(text, 'hello@example.com');
        return Promise.resolve();
      },
    });
    assert.equal(
      invoked,
      true,
      'No awaited operation before the second attempt',
    );
    assert.equal(field.removed, true);
    assert.equal(doc.activeElement, input);
    assert.equal(await result, true);
  }
});

test('Denied or absent clipboard access is reported honestly and still cleans up', async () => {
  for (const clipboard of [
    null,
    {
      writeText: async () => {
        throw new Error('NotAllowed');
      },
    },
  ]) {
    const { doc, input, field } = fixture(() => false);
    assert.equal(
      await copyContactEmail('hello@example.com', doc, clipboard),
      false,
    );
    assert.equal(field.removed, true);
    assert.equal(doc.activeElement, input);
  }
});

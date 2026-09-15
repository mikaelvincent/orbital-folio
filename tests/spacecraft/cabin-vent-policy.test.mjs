import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const vessel = createSpacecraft(THREE);
const furniture = {
  projects: 'projects-workshop',
  about: 'about-personal-study',
  experience: 'case-study-flight-recorder-archive',
  contact: 'contact-flight-console',
};
const namesIn = (root) => {
  const names = new Set();
  root?.traverseVisible((object) => {
    if (object.isMesh)
      for (const name of [object.name, ...(object.userData.parts || [])])
        names.add(name);
  });
  return [...names];
};

test('Only the two label-side air returns remain vent-shaped in each cabin', () => {
  for (const layout of ['wide', 'compact', 'wide']) {
    vessel.setLayout(layout);
    for (const [room, name] of Object.entries(furniture)) {
      const utilities = vessel.group.getObjectByName(`${room}-cabin-utilities`);
      const variant = utilities.children.find((part) => part.visible);
      const returns = variant.userData.utilityParts.filter((part) =>
        part.name.startsWith('upper-air-return-'),
      );
      assert.equal(
        returns.length,
        2,
        `${room}/${layout} retains both air returns`,
      );
      const all = [
        name,
        `${room}-cabin-utilities`,
        `${room}-outboard-equipment`,
      ].flatMap((group) => namesIn(vessel.group.getObjectByName(group)));
      const vents = all.filter((part) =>
        /vent|grille|louvre|intake/i.test(part),
      );
      assert.ok(vents.length > 0, `${room} still has its intended ventilation`);
      assert.ok(
        vents.every((part) =>
          part.startsWith(`${room}-utility-upper-air-return-`),
        ),
        `${room}/${layout}: unexpected cabin ventilation: ${vents.join(', ')}`,
      );
    }
  }
});

test('Retention and audio functions remain recognizable after grille replacement', () => {
  const about = namesIn(vessel.group.getObjectByName(furniture.about));
  assert.ok(about.includes('personal-study-personal-library-captive-mesh'));
  assert.ok(!about.includes('personal-study-blanket-stowage-captive-mesh'));
  assert.ok(about.includes('personal-study-blanket-stowage-textile-restraint'));
  assert.ok(about.includes('personal-study-locker-captive-seal-keeper'));
  const contact = namesIn(vessel.group.getObjectByName(furniture.contact));
  assert.ok(
    contact.includes('contact-flight-audio-microphone-acoustic-windscreen'),
  );
  assert.ok(contact.includes('contact-flight-deck-captive-socket-cap'));
  assert.ok(
    namesIn(vessel.group.getObjectByName(furniture.projects)).includes(
      'projects-workshop-lower-docking-wear-pad',
    ),
  );
  assert.ok(
    namesIn(vessel.group.getObjectByName(furniture.experience)).includes(
      'case-archive-terminal-lower-edge-guard',
    ),
  );
});

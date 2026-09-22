/** Editable demonstration notes, not claims about the owner's education, career,
 * or personal history. Plain Markdown flows into pages in the notebook renderer. */
export const notebookSamples = [
  {
    id: 'journal-story',
    kind: 'journal',
    data: {
      slug: 'my-story',
      title: 'My story',
      subtitle: 'Useful things, thoughtfully made.',
      order: 0,
      sample: true,
      body: `## The space between idea and use

A product begins with an intention: make something easier to understand, remove a frustrating step, or give a small idea room to grow. The interesting work happens between that intention and the moment somebody can actually use it.

That space holds much more than code. It includes the words on a button, the shape of a first visit, the information worth keeping, and the behavior when a connection disappears. Small decisions become the experience.

## A complete path

An interface and the system behind it tell one story. A clear screen needs a dependable source of truth. A reliable service needs an interface that explains what happened. Both deserve care, especially where they meet.

One useful question is: **Can a person follow this all the way through?** From discovering an action to understanding its result, each step should make the next one easier to see.

> Thoughtful engineering makes room for the person using it.

## Notes worth keeping

This notebook holds the quieter side of a portfolio: principles to revisit, questions that remain open, and details that do not fit neatly into a project summary. A finished screen can show what exists. A few honest notes can explain what mattered while making it.

- Keep the problem visible while exploring the solution.
- Prefer a small, coherent experience over an unfinished collection of features.
- Write down the tradeoff, including what was deliberately left out.
- Leave the next person a way to understand the work.

## An ongoing draft

Perspective changes through observation and practice. An idea that seems obvious on paper may become awkward in use; a modest change may solve more than a larger redesign. The useful response is curiosity, followed by another careful iteration.

The story behind useful work is more than a list of finished things. It includes the questions that shaped them, the choices that made them possible, and the details worth carrying forward. Understand the need, make the path clear, and keep learning from what happens next.`,
    },
  },
  {
    id: 'journal-work',
    kind: 'journal',
    data: {
      slug: 'how-i-work',
      title: 'How I work',
      subtitle: 'Understand. Build. Learn.',
      order: 1,
      sample: true,
      body: `## Start with the constraint

Before choosing a tool, make the problem concrete. Who needs to do something, what gets in the way, and what would a useful outcome look like? A short example often reveals more than a long list of features.

Constraints give a design its shape. Time, attention, existing data, and the cost of a mistake all matter. Naming them early makes it easier to explain why one approach fits better than another.

## Build a small, complete slice

Choose one path that reaches a real result. Let the interface, validation, storage, and feedback work together before expanding the surface area. A complete slice exposes the seams that isolated screens and services can hide.

1. Describe the action in plain language.
2. Make the expected outcome observable.
3. Include the ordinary failure cases.
4. Try the path from a fresh starting point.

The goal is enough structure to learn from. A small implementation should still respect the person using it: preserve their work, show useful feedback, and make recovery possible.

## Leave useful evidence

Tests are most valuable when they protect a behavior that matters. Notes are most valuable when they explain a choice that would otherwise be difficult to reconstruct. Neither needs to repeat what the implementation already says clearly.

| Question | Useful evidence |
| --- | --- |
| Does the main path work? | A complete interaction |
| Can a mistake be recovered? | A realistic failure case |
| Does the change help? | A matched before-and-after check |

## Improve with a reason

Observation comes before optimization. A slow interaction needs a measurement; a confusing one needs a closer look at what people expect. Sometimes the best improvement is removing a step rather than making that step faster.

The next iteration should have a reason that can be stated simply. Keep the assumptions nearby, acknowledge what remains uncertain, and make the result easy for someone else to review.

## Finish the edges

Empty states, keyboard focus, loading feedback, and interrupted actions are part of the same product. They are where a design earns trust. A dependable result feels considered even when the happy path is unavailable.`,
    },
  },
  {
    id: 'journal-learning',
    kind: 'journal',
    data: {
      slug: 'learning-notes',
      title: 'Learning notes',
      subtitle: 'Questions become experiments.',
      order: 2,
      sample: true,
      body: `## Begin with a question

A useful learning project starts with something specific enough to explore. What happens if a request arrives twice? Why does one layout feel calmer? Which part of a system owns the answer when two views disagree?

A question creates a boundary. It turns a large subject into an experiment that can be built, observed, and explained. The first attempt does not need to be polished; it needs to reveal something.

## Make the idea tangible

Reading provides vocabulary. Building gives that vocabulary a place to attach. A small prototype can make an abstract tradeoff visible: one queue, one screen, one awkward transition, or one piece of data moving through the whole path.

Keep the experiment small enough that its behavior remains understandable. If too many variables change at once, a surprising result becomes difficult to interpret.

- Write the expectation before running the experiment.
- Change one meaningful variable at a time.
- Keep an example that challenges the assumption.
- Record what happened, including the inconvenient result.

## Explain it back

An explanation is a useful test of understanding. Can the idea be described without relying on the name of a framework? Can another person see the problem, the approach, and the tradeoff from a small diagram or a few paragraphs?

Gaps in an explanation are invitations to investigate. They are easier to address when they are visible than when hidden behind a confident label.

> A good note preserves the question as well as the answer.

## Revisit with fresh eyes

Some lessons become useful only after a second encounter. A pattern that felt unnecessary in a tiny example may help when the work grows; a technique that looked elegant in isolation may add friction to a real workflow.

Keep room to revise the conclusion. The point of an experiment is to improve a model of the world, not to defend the first version of it.

## A small learning loop

Ask a concrete question. Build the smallest honest experiment. Observe what it actually does. Explain the result in plain language. Then choose the next question using what changed.

Over time, these short loops become a library of decisions that can be reused, challenged, and refined. The notes matter because they preserve the reasoning, not because every answer stays the same.`,
    },
  },
  {
    id: 'journal-design',
    kind: 'journal',
    data: {
      slug: 'design-details',
      title: 'Design details',
      subtitle: 'The small things carry the idea.',
      order: 3,
      sample: true,
      body: `## Make the next step visible

A clear interface gives people a sense of where they are, what they can do, and what will happen next. Visual hierarchy helps: one primary action, supporting information nearby, and enough space for the important parts to breathe.

Labels should describe a result. Feedback should arrive where the action happened. A familiar pattern is valuable when it removes a question the person did not come to answer.

## Let the object explain itself

Physical references can make a digital space easier to understand. A notebook suggests reading and turning pages. A screen suggests controls within its surface. A doorway suggests a destination beyond it.

Those references work best when the behavior follows through. Motion should connect the starting state to the result. An object should remain anchored to its surroundings, and its controls should feel like part of the object.

## Use restraint with purpose

Color, contrast, and movement all draw attention. Give them a job. A restrained accent can identify something interactive; a change in brightness can acknowledge focus; a short transition can preserve a sense of location.

| Detail | Purpose |
| --- | --- |
| Consistent spacing | Make relationships easier to read |
| Clear type hierarchy | Separate a title from its explanation |
| Visible focus | Keep keyboard navigation understandable |
| Gentle motion | Connect states without demanding attention |

## Consider the quieter states

The experience includes more than a full screen of finished content. A single item, an empty collection, a long title, or a missing image can reveal whether the design has a clear underlying structure.

Look at these states early. They often suggest simpler rules that improve the ordinary case too. The same is true of touch, keyboard input, and a preference for reduced motion.

## Keep the content in charge

A visual treatment should help the message travel. It should not require every sentence to be the same length or every entry to contain the same amount of detail. Give content a stable frame and let it use the space naturally.

The best finishing touches are often practical: a comfortable line length, a button that stays where expected, a title that remains readable, and a transition that makes the change feel inevitable.`,
    },
  },
  {
    id: 'journal-beyond',
    kind: 'journal',
    data: {
      slug: 'beyond-the-screen',
      title: 'Beyond the screen',
      subtitle: 'Room for a different perspective.',
      order: 4,
      sample: true,
      body: `## Leave room for observation

Not every useful idea arrives while staring at a screen. Everyday objects offer lessons in clarity: a handle that suggests its motion, a sign that can be read in passing, or a tool whose worn edges reveal how it is used.

Looking closely at ordinary things is a way to notice decisions that usually stay invisible. What feels natural? What needs an explanation? What has adapted well to years of use?

## Collect questions, not just answers

A notebook can hold a phrase, a rough sketch, a surprising detail, or a question that has no immediate purpose. The collection does not need to become a project. Sometimes its value is simply keeping a different way of seeing within reach.

An interesting observation can be small: how a map reduces complexity, how a story establishes a place, or how a shared space helps people understand where to go.

## Make space for a change of pace

Attention benefits from variety. A slow activity invites a different kind of observation from a deadline. A conversation can reveal an assumption that felt invisible while working alone. A new setting can make familiar details noticeable again.

Interests, communities, books, and places can all offer that change of pace. What matters is allowing the experience to have its own value before asking what it might contribute to the next piece of work.

> Curiosity does not need every detour to become a deliverable.

## Bring a little of it back

Ideas from outside a project can change how it is approached. Rhythm may influence a transition. Architecture may suggest a clearer hierarchy. A well-made physical object may encourage a more careful digital interaction.

The connection does not have to be literal. Often the useful part is a principle: create a sense of place, give the eye somewhere to rest, or make the intended action visible before it is explained.

## Keep a page open

A personal notebook can remain unfinished. There is always room for another observation, a revised opinion, or a story that becomes worth telling later. The collection can grow without needing to present a perfectly linear account.

For now, the invitation is simple: notice the things that hold attention, ask why they work, and leave enough space for something unexpected.`,
    },
  },
];

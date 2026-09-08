import { decoratePatateur } from "./patateur.js";

// All content and layout belong to this page. The API only supplies the outline.
const content = {
  idea: {
    label: "A small idea",
    texts: [
      "What if we took the long way home?",
      "Make something with someone you've just met.",
      "An excellent day for a very unimportant adventure.",
      "Less hurry. More looking around.",
      "A tiny festival in a very big field.",
      "Leave a little room for the unexpected. It usually brings something good.",
    ],
  },
  note: {
    label: "On the noticeboard",
    titles: ["Bring a chair.", "An open invitation.", "Almost a plan.", "See you outside."],
    texts: [
      "We'll bring the soup. You bring a story. There should be enough spoons, but no promises.",
      "Meet under the big tree, just after lunch. If it rains, we'll make a different plan. That's part of the plan.",
      "The door is open, the kettle is on, and nobody needs to have a particularly good reason to drop by.",
      "A table, six people, a roll of paper. Let's see what happens. No experience necessary; curiosity very welcome. We'll keep going until someone remembers it's time for dinner.",
    ],
  },
  quote: {
    label: "Overheard somewhere",
    texts: [
      "“I came for five minutes and stayed all afternoon.”",
      "“It doesn't have to be useful to be worth doing.”",
      "“We were looking for an answer, but we found a really good question.”",
      "“The best part was the bit we hadn't planned.”",
      "“Can we do that again, but slower?”",
    ],
  },
  list: {
    label: "Things to remember",
    lists: [
      ["A notebook", "Something to share", "Comfortable shoes", "An unfinished idea"],
      ["Water the plants", "Call an old friend", "Take the scenic route"],
      ["Fresh bread", "A very large tomato", "Olive oil", "More people", "A second loaf, just in case"],
      ["Look up", "Listen a little longer", "Ask another question"],
    ],
  },
  postcard: {
    label: "A postcard from nowhere",
    titles: ["Dear everyone,", "Greetings from here,", "A quick hello,"],
    texts: [
      "The light is lovely this afternoon. Someone is playing the same three notes on a piano next door. Wish you were here.",
      "We found a place with no timetable. We had lunch at four and watched the clouds do absolutely nothing in particular.",
      "Not much to report. A walk, a coffee, a conversation that went on longer than expected. A rather good day, actually.",
    ],
  },
};
const kinds = Object.keys(content);
const tones = ["ink", "moss", "peach", "butter", "fog"];
const board = document.querySelector("#board");
const organicShapes = document.querySelector("#organicShapes");
const count = document.querySelector("#cardCount");
const cards = new Map();
const snippets = [];
const shortContent = {
  one: ["Come in.", "Tea first.", "Why not?", "Hello again.", "Take a seat."],
  two: ["Come early.\nStay late.", "A little less.\nA little better.", "No rush.\nWe're here.", "Bring a cup.\nStay for tea."],
};
let nextId = 1;

// Plain board entries never enter the decoration lifecycle.
function decoratedItems() {
  return [...cards.values()].filter((card) => card.decorated).concat(snippets);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function newSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

function fillContent(body, kind) {
  const source = content[kind];
  // Replace only the content child, keeping the decoration owned by the API.
  body.replaceChildren();
  if (source.titles) {
    const title = document.createElement("h2");
    title.textContent = pick(source.titles);
    body.append(title);
  }
  if (source.lists) {
    const list = document.createElement("ul");
    for (const text of pick(source.lists)) {
      const item = document.createElement("li");
      item.textContent = text;
      list.append(item);
    }
    body.append(list);
  } else {
    const copy = document.createElement(kind === "quote" ? "blockquote" : "p");
    copy.textContent = pick(source.texts);
    body.append(copy);
  }
}

function updateCount() {
  count.textContent = `${cards.size} ${cards.size === 1 ? "thing" : "things"} on the board`;
  board.querySelector(".empty-board")?.remove();
  if (cards.size === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-board";
    empty.textContent = "A little room for something new. Add a note to begin again.";
    board.append(empty);
  }
}

function addCard(kind = pick(kinds), tone = pick(tones), decorated = Math.random() >= 0.25) {
  const id = nextId++;
  const element = document.createElement("article");
  element.className = "demo-card";
  element.dataset.kind = kind;
  element.dataset.tone = tone;
  element.dataset.decoration = decorated ? "organic" : "plain";
  element.setAttribute("aria-label", `Note ${id}: ${content[kind].label}`);

  const top = document.createElement("div");
  top.className = "card-top";
  const label = document.createElement("p");
  label.className = "card-label";
  label.textContent = `${String(id).padStart(2, "0")} / ${content[kind].label}`;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-card";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove note ${id}`);
  top.append(label, remove);

  const body = document.createElement("div");
  body.className = "card-body";
  fillContent(body, kind);
  element.append(top, body);
  board.append(element);

  const card = { element, body, kind, decorated, seed: newSeed(), decoration: null };
  if (decorated && organicShapes.checked) {
    card.decoration = decoratePatateur(element, { seed: card.seed, wobble: 16 });
  }
  cards.set(element, card);
  remove.addEventListener("click", () => {
    const next = element.nextElementSibling ?? element.previousElementSibling;
    card.decoration?.destroy();
    cards.delete(element);
    element.remove();
    updateCount();
    (next?.querySelector("button") ?? document.querySelector("#addCard")).focus();
  });
  updateCount();
}

document.querySelector("#shuffleText").addEventListener("click", () => {
  for (const card of cards.values()) fillContent(card.body, card.kind);
  for (const snippet of snippets) snippet.body.textContent = pick(shortContent[snippet.kind]);
  // No API call: ResizeObserver follows the size changes caused by new text.
});

document.querySelector("#shuffleShapes").addEventListener("click", () => {
  for (const card of decoratedItems()) {
    card.seed = newSeed();
    card.decoration?.setOptions({ seed: card.seed });
  }
});

document.querySelector("#addCard").addEventListener("click", () => addCard());

document.querySelector("#boardWidth").addEventListener("input", (event) => {
  const width = `${event.target.value}%`;
  document.querySelector("main").style.setProperty("--board-width", width);
  document.querySelector("#boardWidthValue").value = width;
  // No API call: the page controls its grid; decorations follow their containers.
});

organicShapes.addEventListener("change", () => {
  for (const card of decoratedItems()) {
    if (organicShapes.checked) {
      card.decoration = decoratePatateur(card.element, { seed: card.seed, wobble: card.wobble ?? 16 });
    } else {
      card.decoration.destroy();
      card.decoration = null;
    }
  }
  document.querySelector("#shuffleShapes").disabled = !organicShapes.checked;
});

// Short decorations participate in ordinary inline and flex layout.
for (const element of document.querySelectorAll("[data-short]")) {
  const snippet = {
    element, body: element.querySelector(".short-copy"), kind: element.dataset.short,
    seed: newSeed(), wobble: 6, decoration: null,
  };
  snippet.decoration = decoratePatateur(element, { seed: snippet.seed, wobble: snippet.wobble });
  snippets.push(snippet);
}

// Guarantee a mix of content types, colours, and five genuinely plain entries.
for (let index = 0; index < 20; index += 1) {
  addCard(kinds[index % kinds.length], tones[(index + Math.floor(index / kinds.length)) % tones.length], index % 4 !== 2);
}

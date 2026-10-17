(() => {
  "use strict";

  const keywordNames = new Set([
    "as",
    "boolean",
    "catch",
    "class",
    "const",
    "else",
    "error",
    "export",
    "extends",
    "fail",
    "fails",
    "false",
    "if",
    "import",
    "int",
    "match",
    "never",
    "new",
    "number",
    "provide",
    "readonly",
    "retry",
    "service",
    "string",
    "true",
    "try",
    "type",
    "typeof",
    "unknown",
    "uses",
    "void",
  ]);

  const functions = {
    getUser: {
      source: `export const getUser = (id: string): User
  fails UserMissing | StoreUnavailable
  uses Users.find =>
  match Users.find(id) {
    Some(user) => user,
    None => fail(UserMissing({ id }))
  }`,
      success: "User",
      failures: "UserMissing | StoreUnavailable",
      uses: "Users.find",
      description:
        "getUser returns a User, can fail when the user is missing or the store is unavailable, and requires Users.find.",
      effect: `const getUser = (id: string): Effect.Effect<
  User,
  UserMissing | StoreUnavailable,
  Users
> =>
  Effect.flatMap(
    Users.use((users) => users.find(id)),
    (found) => Option.match(found, {
      onNone: () => Effect.fail(new UserMissing({ id })),
      onSome: (user) => Effect.succeed(user)
    })
  )`,
    },
    rename: {
      source: `export const rename = (id: string, name: string): User
  fails UserMissing | StoreUnavailable
  uses Users.find | Users.save => {
  const user = getUser(id)
  const renamed: User = { ...user, name }
  Users.save(renamed)
  renamed
}`,
      success: "User",
      failures: "UserMissing | StoreUnavailable",
      uses: "Users.find | Users.save",
      description:
        "rename returns a User, has the same failures as getUser, and requires Users.find and Users.save.",
      effect: `const rename = (id: string, name: string): Effect.Effect<
  User,
  UserMissing | StoreUnavailable,
  Users
> => Effect.gen(function* () {
  const user = yield* getUser(id)
  const renamed: User = { ...user, name }
  yield* Users.use((users) => users.save(renamed))
  return renamed
})`,
    },
    displayName: {
      source: `export const displayName = (id: string): string
  fails StoreUnavailable
  uses Users.find =>
  try {
    getUser(id).name
  } catch {
    UserMissing(error) => "Guest"
  }`,
      success: "string",
      failures: "StoreUnavailable",
      uses: "Users.find",
      description:
        "displayName returns a string, handles UserMissing, can fail with StoreUnavailable, and requires Users.find.",
      effect: `const displayName = (id: string): Effect.Effect<
  string,
  StoreUnavailable,
  Users
> => Effect.map(getUser(id), (user) => user.name).pipe(
  Effect.catchTag(
    "UserMissing",
    () => Effect.succeed("Guest")
  )
)`,
    },
    activeNames: {
      source: `export const activeNames = (): string[]
  fails StoreUnavailable
  uses Users.all =>
  Users.all()
    |> filter((user) => user.active)
    |> map((user) => user.name)`,
      success: "string[]",
      failures: "StoreUnavailable",
      uses: "Users.all",
      description:
        "activeNames returns string[], can fail with StoreUnavailable, and requires Users.all. Its collection callbacks remain pure.",
      effect: `const activeNames = (): Effect.Effect<
  ReadonlyArray<string>,
  StoreUnavailable,
  Users
> => Effect.map(
  Users.use((users) => users.all()),
  (all) => all.filter((user) => user.active).map((user) => user.name)
)`,
    },
  };

  const functionNames = Object.keys(functions);

  const appendSyntaxToken = (fragment, className, value) => {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = value;
    fragment.append(span);
  };

  const highlightCode = (code) => {
    const source = code.textContent;
    const fragment = document.createDocumentFragment();
    let plainStart = 0;
    let index = 0;

    const appendPlainText = (end) => {
      if (end > plainStart) fragment.append(source.slice(plainStart, end));
    };

    while (index < source.length) {
      let end = index;
      let className = null;
      const character = source[index];
      const nextCharacter = source[index + 1];

      if (character === "/" && nextCharacter === "/") {
        end = source.indexOf("\n", index + 2);
        if (end === -1) end = source.length;
        className = "syntax-comment";
      } else if (character === "/" && nextCharacter === "*") {
        const commentEnd = source.indexOf("*/", index + 2);
        end = commentEnd === -1 ? source.length : commentEnd + 2;
        className = "syntax-comment";
      } else if (character === '"' || character === "'" || character === "`") {
        const quote = character;
        end = index + 1;
        while (end < source.length) {
          if (source[end] === "\\") {
            end += 2;
          } else if (source[end] === quote) {
            end += 1;
            break;
          } else {
            end += 1;
          }
        }
        className = "syntax-string";
      } else if (/[A-Za-z_$]/.test(character)) {
        end = index + 1;
        while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) {
          end += 1;
        }
        if (keywordNames.has(source.slice(index, end))) {
          className = "syntax-keyword";
        }
      }

      if (className !== null) {
        appendPlainText(index);
        appendSyntaxToken(fragment, className, source.slice(index, end));
        index = end;
        plainStart = end;
      } else {
        index = end > index ? end : index + 1;
      }
    }

    appendPlainText(source.length);
    code.replaceChildren(fragment);
  };

  const highlightAllCode = () => {
    document.querySelectorAll("pre code").forEach(highlightCode);
  };

  const readStored = (key) => {
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStored = (key, value) => {
    try {
      globalThis.localStorage.setItem(key, value);
    } catch {
      // Storage can be blocked, and the pages work without it.
    }
  };

  const tabStorageKey = "effective.tab";
  const pageName = document.body.classList.contains("book-page")
    ? "book"
    : document.body.classList.contains("spec-page")
    ? "spec"
    : null;
  const sectionStorageKey = `effective.section.${pageName}`;

  // Keeps the anchor at the same screen position while a change above it moves the page.
  const holdPosition = (anchor, change) => {
    const before = anchor.getBoundingClientRect().top;
    change();
    const delta = anchor.getBoundingClientRect().top - before;
    if (delta !== 0) {
      globalThis.scrollBy({ top: delta, left: 0, behavior: "instant" });
    }
  };

  const normalizeFunctionName = (value) => {
    const normalized = value.trim().replace(/\s*\(\s*\)\s*$/, "").toLowerCase();
    return functionNames.find((name) => name.toLowerCase() === normalized) ||
      null;
  };

  const setupContractExplorer = () => {
    const form = document.querySelector("form[data-contract-explorer]");
    if (!form) return;

    const input = form.querySelector("#contract-function");
    const source = form.querySelector("#contract-source > code");
    const effect = form.querySelector("#contract-effect > code");
    const success = form.querySelector("#contract-success");
    const failures = form.querySelector("#contract-failures");
    const uses = form.querySelector("#contract-uses");
    const description = form.querySelector("#contract-description");
    const message = form.querySelector("#contract-message");
    const signal = form.querySelector(".contract-signal");
    const readingRows = Array.from(
      form.querySelectorAll(".contract-reading dl > div"),
    );
    const controls = form.querySelector(".contract-controls");
    const buttons = Array.from(form.querySelectorAll("button[data-function]"));

    if (
      !input ||
      !source ||
      !effect ||
      !success ||
      !failures ||
      !uses ||
      !description ||
      !message
    ) {
      return;
    }

    let selectedName = null;
    // An empty easing makes animate() throw, so a missing token falls back to ease-out.
    const easing = getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-out").trim() || "ease-out";
    const playSelectionEffect = () => {
      if (
        !signal?.animate ||
        globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) return;

      signal.getAnimations().forEach((animation) => animation.cancel());
      signal.animate(
        [
          { transform: "scaleX(0)", opacity: 1 },
          { transform: "scaleX(1)", opacity: 1, offset: .65 },
          { transform: "scaleX(1)", opacity: 0 },
        ],
        { duration: 420, easing },
      );
      readingRows.forEach((row, index) => {
        row.getAnimations().forEach((animation) => animation.cancel());
        row.animate(
          [
            { transform: "translateY(8px)", opacity: .35 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          // Without a backwards fill, a delayed row shows at full opacity until its delay ends.
          { duration: 360, delay: index * 55, easing, fill: "backwards" },
        );
      });
    };

    const selectFunction = (candidate) => {
      const name = normalizeFunctionName(candidate);
      if (name === null) {
        message.textContent = `Choose one of: ${functionNames.join(", ")}.`;
        return false;
      }

      const contract = functions[name];
      input.value = name;
      source.textContent = contract.source;
      highlightCode(source);
      effect.textContent = contract.effect;
      highlightCode(effect);
      success.textContent = contract.success;
      failures.textContent = contract.failures;
      uses.textContent = contract.uses;
      description.textContent = contract.description;
      message.textContent = `Showing ${name}.`;

      buttons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.function === name),
        );
      });

      // The effect runs after the state update, so an animation error cannot leave stale state.
      const changed = selectedName !== null && selectedName !== name;
      selectedName = name;
      if (changed) playSelectionEffect();
      return true;
    };

    buttons.forEach((button) => {
      button.addEventListener(
        "click",
        () => selectFunction(button.dataset.function),
      );
    });

    input.addEventListener("change", () => selectFunction(input.value));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      selectFunction(input.value);
    });

    if (!selectFunction(input.value)) return;
    if (controls) controls.hidden = false;
  };

  const setupTopbarHeight = () => {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const update = () => {
      document.documentElement.style.setProperty(
        "--topbar-height",
        `${topbar.getBoundingClientRect().height}px`,
      );
    };
    update();
    if ("ResizeObserver" in globalThis) {
      new ResizeObserver(update).observe(topbar);
    } else {
      globalThis.addEventListener("resize", update);
    }
  };

  const setupCaptionTitles = () => {
    document.querySelectorAll("figure.code > figcaption").forEach(
      (caption, index) => {
        const text = Array.from(caption.childNodes).find((node) =>
          node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ""
        );
        if (!text) return;
        const title = document.createElement("span");
        title.className = "code-title";
        title.id = `code-title-${index + 1}`;
        text.replaceWith(title);
        title.append(text);
      },
    );
  };

  let copyStatus = null;
  const announceCopy = (message) => {
    if (!copyStatus) {
      copyStatus = document.createElement("p");
      copyStatus.className = "visually-hidden";
      copyStatus.setAttribute("role", "status");
      document.body.append(copyStatus);
    }
    copyStatus.textContent = "";
    copyStatus.textContent = message;
  };

  const bindCopyButton = (button, getText, getTitle) => {
    let timer = null;
    button.addEventListener("click", async () => {
      let label = "Copied";
      try {
        await navigator.clipboard.writeText(getText());
      } catch {
        label = "Copy failed";
      }
      button.textContent = label;
      announceCopy(
        label === "Copied" ? `Copied: ${getTitle()}` : "Copy failed",
      );
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = "Copy";
      }, 1600);
    });
  };

  const setupCopyButtons = () => {
    if (!navigator.clipboard) return;

    document.querySelectorAll("figure.code > figcaption").forEach(
      (caption) => {
        const figure = caption.parentElement;
        const title = caption.querySelector(".code-title");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-code";
        button.textContent = "Copy";
        if (title) button.setAttribute("aria-describedby", title.id);

        const actions = document.createElement("div");
        actions.className = "code-actions";
        actions.append(...caption.querySelectorAll("a"), button);
        caption.append(actions);

        bindCopyButton(
          button,
          () =>
            (figure.querySelector(".code-panel:not([hidden]) pre code") ??
              figure.querySelector("pre code")).textContent,
          () => title?.textContent.trim() ?? "code",
        );
      },
    );
  };

  const setupCodeTabs = () => {
    const figures = document.querySelectorAll("figure[data-tabs]");
    const groups = [];
    figures.forEach((figure, figureIndex) => {
      const panels = Array.from(
        figure.querySelectorAll(".code-panel[data-tab]"),
      );
      const caption = figure.querySelector("figcaption");
      if (panels.length < 2 || !caption) return;

      const number = figureIndex + 1;
      const title = caption.querySelector(".code-title");
      if (!caption.id) caption.id = `tabs-${number}-caption`;

      const tablist = document.createElement("div");
      tablist.setAttribute("role", "tablist");
      tablist.setAttribute("aria-labelledby", title?.id ?? caption.id);

      const tabs = panels.map((panel) => {
        const label = panel.dataset.tab;
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const tab = document.createElement("button");
        tab.type = "button";
        tab.setAttribute("role", "tab");
        tab.id = `tabs-${number}-${slug}-tab`;
        tab.textContent = label;
        panel.id = `tabs-${number}-${slug}`;
        tab.setAttribute("aria-controls", panel.id);
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", tab.id);
        return tab;
      });

      const activate = (selected, moveFocus) => {
        tabs.forEach((tab, index) => {
          const isActive = index === selected;
          tab.setAttribute("aria-selected", String(isActive));
          tab.tabIndex = isActive ? 0 : -1;
          panels[index].hidden = !isActive;
        });
        if (moveFocus) tabs[selected].focus();
      };

      const choose = (index, moveFocus) => {
        const label = panels[index].dataset.tab;
        holdPosition(figure, () => {
          activate(index, moveFocus);
          groups.forEach((group) => {
            if (group.figure !== figure) group.select(label);
          });
        });
        writeStored(tabStorageKey, label);
      };

      groups.push({
        figure,
        select: (label) => {
          const index = panels.findIndex((panel) =>
            panel.dataset.tab === label
          );
          if (index !== -1) activate(index, false);
        },
      });

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => choose(index, false));
        tab.addEventListener("keydown", (event) => {
          let target = null;
          if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft") {
            target = (index - 1 + tabs.length) % tabs.length;
          } else if (event.key === "Home") target = 0;
          else if (event.key === "End") target = tabs.length - 1;
          if (target === null) return;
          event.preventDefault();
          choose(target, true);
        });
      });

      tablist.append(...tabs);
      caption.after(tablist);
      activate(0, false);
      figure.classList.add("tabs-ready");
    });

    const stored = readStored(tabStorageKey);
    if (stored === null || groups.length === 0) return;
    // A heading in the URL must stay in place when tab panels above it change height.
    const target = globalThis.location.hash.length > 1
      ? document.getElementById(
        decodeURIComponent(globalThis.location.hash.slice(1)),
      )
      : null;
    const applyStored = () => groups.forEach((group) => group.select(stored));
    if (target) holdPosition(target, applyStored);
    else applyStored();
  };

  const setupContinueReading = () => {
    if (pageName === null || globalThis.location.hash !== "") return;

    const id = readStored(sectionStorageKey);
    const firstSection = document.querySelector(".section");
    const section = id ? document.getElementById(id) : null;
    const heading = id ? document.getElementById(`heading-${id}`) : null;
    if (!section || !heading || section === firstSection) return;

    const anchor = pageName === "book"
      ? document.querySelector(".hero-actions .primary-action")
      : document.querySelector(".reference-bottom .button");
    if (!anchor) return;

    const link = document.createElement("a");
    link.className = "button secondary-action continue-action";
    link.href = `#${id}`;
    link.append(`Continue: ${heading.textContent} `);
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↓";
    link.append(arrow);

    if (pageName === "spec") {
      const actions = document.createElement("div");
      actions.className = "reference-actions";
      anchor.replaceWith(actions);
      actions.append(anchor);
    }
    // The link goes last, so the standard buttons keep their places for every reader.
    anchor.parentElement.append(link);
  };

  const setupContents = () => {
    const anchors = Array.from(
      document.querySelectorAll(".contents a[href^='#']"),
    );
    if (anchors.length === 0) return;

    const linksBySection = new Map();
    anchors.forEach((anchor) => {
      const id = decodeURIComponent(anchor.hash.slice(1));
      const section = document.getElementById(id);
      if (section?.classList.contains("section")) {
        const sectionLinks = linksBySection.get(section) || [];
        sectionLinks.push(anchor);
        linksBySection.set(section, sectionLinks);
      }
    });

    const sections = Array.from(linksBySection.keys());
    if (sections.length === 0) return;

    const summary = document.querySelector("details.contents-menu > summary");
    const currentName = document.createElement("span");
    if (summary) {
      const prefix = document.createElement("span");
      prefix.className = "visually-hidden";
      prefix.textContent = `${summary.textContent}: `;
      summary.replaceChildren(prefix, currentName);
    }

    let previous = null;
    let moved = false;
    const setCurrentSection = (section) => {
      anchors.forEach((anchor) => anchor.removeAttribute("aria-current"));
      const sectionLinks = linksBySection.get(section);
      sectionLinks?.forEach((anchor) =>
        anchor.setAttribute("aria-current", "location")
      );
      currentName.textContent = sectionLinks?.[0].textContent ?? "";
      // The first call only reads the start position, so it must not replace a stored resume point.
      if (previous !== null && section !== previous && pageName !== null) {
        moved = true;
        writeStored(sectionStorageKey, section.id);
      }
      previous = section;
    };
    globalThis.addEventListener("pagehide", () => {
      if (moved && previous !== null && pageName !== null) {
        writeStored(sectionStorageKey, previous.id);
      }
    });

    const readingLine = () => globalThis.innerHeight * 0.22;

    const chooseNearestSection = () => {
      const line = readingLine();
      return sections.reduce((nearest, section) => {
        if (section.getBoundingClientRect().top <= line) return section;
        return nearest;
      }, sections[0]);
    };

    setCurrentSection(chooseNearestSection());

    if ("IntersectionObserver" in globalThis) {
      const visibleSections = new Set();
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) visibleSections.add(entry.target);
            else visibleSections.delete(entry.target);
          });

          const candidates = visibleSections.size
            ? Array.from(visibleSections)
            : [chooseNearestSection()];
          const line = readingLine();
          const current = candidates.reduce((nearest, section) => {
            const distance = Math.abs(
              section.getBoundingClientRect().top - line,
            );
            const nearestDistance = Math.abs(
              nearest.getBoundingClientRect().top - line,
            );
            return distance < nearestDistance ? section : nearest;
          });
          setCurrentSection(current);
        },
        { rootMargin: "-15% 0px -70% 0px" },
      );
      sections.forEach((section) => observer.observe(section));
    }

    // Only the mobile copy of the contents sits inside the menu, so desktop clicks change nothing.
    anchors.forEach((anchor) => {
      anchor.addEventListener("click", () => {
        const menu = anchor.closest("details.contents-menu");
        if (menu) menu.open = false;
      });
    });
  };

  const setupHeroGlow = () => {
    const hero = document.querySelector(".hero");
    if (!hero || !("IntersectionObserver" in globalThis)) return;

    let inView = false;
    const update = () => {
      hero.classList.toggle("glow-visible", inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(hero);
    document.addEventListener("visibilitychange", update);
  };

  const setupEntryMotion = () => {
    if (!("IntersectionObserver" in globalThis)) return;

    const groupCounts = new Map();
    const targets = document.querySelectorAll(
      "h2, .section > p:first-of-type, .code, .exercise, .chapter-index a",
    );
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const kind = entry.target.matches("h2")
          ? "enter-heading"
          : entry.target.matches(".code")
          ? "enter-code"
          : "enter-copy";
        entry.target.classList.add(kind);
      });
    }, { threshold: 0.08 });

    targets.forEach((target) => {
      const group = target.closest(".section, .chapter-index") ||
        target.parentElement;
      const index = groupCounts.get(group) || 0;
      target.style.setProperty(
        "--entry-delay",
        `${Math.min(index * 70, 210)}ms`,
      );
      groupCounts.set(group, index + 1);
      observer.observe(target);
    });
  };

  const setupSourceDrawer = () => {
    const links = Array.from(
      document.querySelectorAll(
        "a[href$='.eff'], a[href$='.ts'], a[href$='.json'], a[href$='.lft'], a[href$='.txt']",
      ),
    ).filter((link) =>
      !link.hasAttribute("download") &&
      !link.getAttribute("href").startsWith("fonts/")
    );
    if (links.length === 0 || typeof HTMLDialogElement !== "function") return;

    const drawer = document.createElement("dialog");
    drawer.className = "source-drawer";
    drawer.setAttribute("aria-labelledby", "source-drawer-title");
    drawer.innerHTML =
      '<figure class="code"><figcaption><span id="source-drawer-title"></span><div class="code-actions"><button type="button" class="copy-code" aria-describedby="source-drawer-title">Copy</button><button type="button" class="close-drawer" autofocus>Close</button></div></figcaption><pre tabindex="0"><code class="language-effective"></code></pre></figure>';
    document.body.append(drawer);

    const title = drawer.querySelector("#source-drawer-title");
    const code = drawer.querySelector("code");
    drawer.querySelector(".close-drawer").addEventListener(
      "click",
      () => drawer.close(),
    );
    const copyButton = drawer.querySelector(".copy-code");
    if (navigator.clipboard) {
      bindCopyButton(
        copyButton,
        () => code.textContent,
        () => title.textContent,
      );
    } else {
      copyButton.remove();
    }
    // The figure fills the drawer, so only a backdrop click targets the dialog itself.
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) drawer.close();
    });

    const sources = new Map();
    const loadSource = (url) => {
      if (!sources.has(url)) {
        sources.set(
          url,
          fetch(url).then((response) => {
            if (!response.ok) throw new Error(`${response.status} ${url}`);
            return response.text();
          }),
        );
      }
      return sources.get(url);
    };

    // Only the most recent click may fill the drawer or fall back to navigation.
    let requestedUrl = null;

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        // Modified clicks keep their new-tab and download behavior.
        if (
          event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey
        ) {
          return;
        }
        event.preventDefault();
        const path = link.getAttribute("href");
        const url = link.href;
        requestedUrl = url;
        link.setAttribute("aria-busy", "true");
        loadSource(url).then((text) => {
          if (requestedUrl !== url) return;
          title.textContent = path;
          code.textContent = text;
          // Plain text pages hold prose, and the keyword colors would mark ordinary words.
          if (/\.(eff|ts|json)$/.test(path)) highlightCode(code);
          code.parentElement.scrollTop = 0;
          link.closest("details.contents-menu")?.removeAttribute("open");
          if (!drawer.open) drawer.showModal();
        }).catch(() => {
          sources.delete(url);
          if (requestedUrl === url) globalThis.location.assign(url);
        }).finally(() => link.removeAttribute("aria-busy"));
      });
    });
  };

  // Both pages load this script with defer, so the document is already parsed.
  highlightAllCode();
  setupTopbarHeight();
  setupContractExplorer();
  setupContinueReading();
  setupContents();
  setupCaptionTitles();
  setupCopyButtons();
  setupCodeTabs();
  setupHeroGlow();
  setupEntryMotion();
  // The drawer is added last, so the entry motion does not animate its figure.
  setupSourceDrawer();
})();

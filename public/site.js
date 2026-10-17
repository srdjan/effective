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

  const setupCodeTabs = () => {
    const figures = document.querySelectorAll("figure[data-tabs]");
    figures.forEach((figure, figureIndex) => {
      const panels = Array.from(
        figure.querySelectorAll(".code-panel[data-tab]"),
      );
      const caption = figure.querySelector("figcaption");
      if (panels.length < 2 || !caption) return;

      const number = figureIndex + 1;
      if (!caption.id) caption.id = `tabs-${number}-caption`;

      const tablist = document.createElement("div");
      tablist.setAttribute("role", "tablist");
      tablist.setAttribute("aria-labelledby", caption.id);

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

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activate(index, false));
        tab.addEventListener("keydown", (event) => {
          let target = null;
          if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft") {
            target = (index - 1 + tabs.length) % tabs.length;
          } else if (event.key === "Home") target = 0;
          else if (event.key === "End") target = tabs.length - 1;
          if (target === null) return;
          event.preventDefault();
          activate(target, true);
        });
      });

      tablist.append(...tabs);
      caption.after(tablist);
      activate(0, false);
      figure.classList.add("tabs-ready");
    });
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

    const setCurrentSection = (section) => {
      anchors.forEach((anchor) => anchor.removeAttribute("aria-current"));
      linksBySection
        .get(section)
        ?.forEach((anchor) => anchor.setAttribute("aria-current", "location"));
    };

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
    const links = document.querySelectorAll("a[href$='.eff']");
    if (links.length === 0 || typeof HTMLDialogElement !== "function") return;

    const drawer = document.createElement("dialog");
    drawer.className = "source-drawer";
    drawer.setAttribute("aria-labelledby", "source-drawer-title");
    drawer.innerHTML =
      '<figure class="code"><figcaption><span id="source-drawer-title"></span><button type="button" autofocus>Close</button></figcaption><pre tabindex="0"><code class="language-effective"></code></pre></figure>';
    document.body.append(drawer);

    const title = drawer.querySelector("#source-drawer-title");
    const code = drawer.querySelector("code");
    drawer.querySelector("button").addEventListener(
      "click",
      () => drawer.close(),
    );
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
        loadSource(url).then((text) => {
          if (requestedUrl !== url) return;
          title.textContent = path;
          code.textContent = text;
          highlightCode(code);
          code.parentElement.scrollTop = 0;
          link.closest("details.contents-menu")?.removeAttribute("open");
          if (!drawer.open) drawer.showModal();
        }).catch(() => {
          sources.delete(url);
          if (requestedUrl === url) globalThis.location.assign(url);
        });
      });
    });
  };

  // Both pages load this script with defer, so the document is already parsed.
  highlightAllCode();
  setupContractExplorer();
  setupContents();
  setupCodeTabs();
  setupEntryMotion();
  // The drawer is added last, so the entry motion does not animate its figure.
  setupSourceDrawer();
})();

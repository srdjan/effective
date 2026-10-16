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
    },
  };

  const functionNames = Object.keys(functions);

  const appendSyntaxToken = (fragment, className, value) => {
    if (className === null) {
      fragment.append(document.createTextNode(value));
      return;
    }

    const span = document.createElement("span");
    span.className = className;
    span.textContent = value;
    fragment.append(span);
  };

  const highlightCode = (code) => {
    if (code.dataset.syntaxHighlighted === "true") return;

    const source = code.textContent || "";
    const fragment = document.createDocumentFragment();
    let plainStart = 0;
    let index = 0;

    const appendPlainText = (end) => {
      if (end > plainStart) {
        appendSyntaxToken(fragment, null, source.slice(plainStart, end));
      }
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
    code.dataset.syntaxHighlighted = "true";
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
      !success ||
      !failures ||
      !uses ||
      !description ||
      !message
    ) {
      return;
    }

    let selectedName = null;

    const selectFunction = (candidate) => {
      const name = normalizeFunctionName(candidate);
      if (name === null) {
        message.textContent = `Choose one of: ${functionNames.join(", ")}.`;
        return false;
      }

      const contract = functions[name];
      selectedName = name;
      input.value = name;
      source.textContent = contract.source;
      delete source.dataset.syntaxHighlighted;
      highlightCode(source);
      success.textContent = contract.success;
      failures.textContent = contract.failures;
      uses.textContent = contract.uses;
      description.textContent = contract.description;
      message.textContent = `Showing ${name}.`;

      buttons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.function === selectedName),
        );
      });
      return true;
    };

    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const name = button.dataset.function;
        if (name) selectFunction(name);
      });
    });

    input.addEventListener("change", () => selectFunction(input.value));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      selectFunction(input.value);
    });

    if (!selectFunction(input.value)) return;
    if (controls) controls.hidden = false;
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

    const chooseNearestSection = () => {
      const readingLine = globalThis.innerHeight * 0.22;
      return sections.reduce((nearest, section) => {
        if (section.getBoundingClientRect().top <= readingLine) return section;
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
          const readingLine = globalThis.innerHeight * 0.22;
          const current = candidates.reduce((nearest, section) => {
            const distance = Math.abs(
              section.getBoundingClientRect().top - readingLine,
            );
            const nearestDistance = Math.abs(
              nearest.getBoundingClientRect().top - readingLine,
            );
            return distance < nearestDistance ? section : nearest;
          });
          setCurrentSection(current);
        },
        { rootMargin: "-15% 0px -70% 0px" },
      );
      sections.forEach((section) => observer.observe(section));
    }

    const narrowScreen = globalThis.matchMedia("(max-width: 800px)");
    anchors.forEach((anchor) => {
      anchor.addEventListener("click", () => {
        if (!narrowScreen.matches) return;
        document
          .querySelectorAll("details.contents-menu, .contents-menu details")
          .forEach((details) => {
            details.open = false;
          });
      });
    });
  };

  const setupEntryMotion = () => {
    if (!("IntersectionObserver" in globalThis)) return;

    const groupCounts = new Map();
    const targets = document.querySelectorAll(
      "h2, .lead, .section > p:first-of-type, .code, .exercise, .chapter-index a",
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

  const initialize = () => {
    highlightAllCode();
    setupContractExplorer();
    setupContents();
    setupEntryMotion();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

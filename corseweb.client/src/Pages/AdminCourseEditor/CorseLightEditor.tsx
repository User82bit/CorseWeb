import { useEffect, useMemo, useState } from "react";
import type { CorseLightDiagnostic, CorseLightScript } from "../../types/course";
import "./CorseLightEditor.scss";

type Props = {
  scripts: CorseLightScript[];
  diagnostics: CorseLightDiagnostic[];
  locale: string;
  onChange: (scripts: CorseLightScript[]) => void;
};

type EventName = "lesson.start" | "lesson.finish" | "activity.submit";

const EVENTS: EventName[] = ["lesson.start", "lesson.finish", "activity.submit"];
const MAX_SOURCE_BYTES = 16 * 1024;
const MAX_SCRIPTS = 100;

function createScriptId() {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `cl-${randomPart}`;
}

function eventTemplate(eventName: EventName): string {
  switch (eventName) {
    case "lesson.start":
      return `on lesson.start {
  state.set("visited", true);
}`;
    case "lesson.finish":
      return `on lesson.finish {
  if (state.get("visited") == true) {
    activity.feedback("Aula concluída. Bom trabalho!", "success");
  }
}`;
    case "activity.submit":
      return `on activity.submit {
  if (activity.isCorrect()) {
    activity.feedback("Resposta correta!", "success");
  } else {
    activity.feedback("Revise sua resposta.", "warning");
  }
}`;
  }
}

function copyFor(locale: string) {
  if (locale.startsWith("en")) {
    return {
      title: "CorseLight logic",
      subtitle: "Create bounded course scripts. The server validates and executes them; this editor never runs source code.",
      scripts: "Scripts",
      add: "New script",
      empty: "No scripts yet",
      emptyHint: "Create a script to add course-specific behavior.",
      name: "Script name",
      enabled: "Enabled",
      source: "Source · CL 0.1",
      sourceHint: "Add one or more event blocks. Each event can appear only once in a script.",
      bytes: "bytes",
      limit: "The source exceeds the 16 KiB limit.",
      insertEvent: "Insert event",
      reference: "Language reference",
      events: "Supported events",
      natives: "Native functions",
      rules: "Runtime limits",
      noLoops: "No loops, custom functions, JavaScript, HTML, network or file access.",
      state: "Persistent state",
      activity: "Activity",
      content: "Content",
      context: "Context",
      diagnostics: "Validation diagnostics",
      noDiagnostics: "No diagnostics were returned by the last server validation.",
      stale: "Diagnostics refresh when the course is saved.",
      line: "Line",
      column: "Column",
      remove: "Delete script",
      removeConfirm: "Delete this script?",
      duplicateEvent: "This event block already exists in this script.",
      maxScripts: "A course can contain at most 100 scripts.",
      saveHint: "Save the course to validate scripts with the server. Drafts may keep invalid source while it is being edited.",
      disabledHint: "Disabled scripts are not executed, but they are still validated before publication.",
      select: "Select a script",
      rename: "A descriptive name helps you find the script later.",
    };
  }
  if (locale.startsWith("es")) {
    return {
      title: "Lógica CorseLight",
      subtitle: "Crea scripts limitados para el curso. El servidor los valida y ejecuta; este editor nunca ejecuta el código fuente.",
      scripts: "Scripts",
      add: "Nuevo script",
      empty: "Todavía no hay scripts",
      emptyHint: "Crea un script para agregar comportamiento al curso.",
      name: "Nombre del script",
      enabled: "Habilitado",
      source: "Código fuente · CL 0.1",
      sourceHint: "Agrega uno o más bloques de evento. Cada evento puede aparecer una sola vez por script.",
      bytes: "bytes",
      limit: "El código supera el límite de 16 KiB.",
      insertEvent: "Insertar evento",
      reference: "Referencia del lenguaje",
      events: "Eventos compatibles",
      natives: "Funciones nativas",
      rules: "Límites del runtime",
      noLoops: "Sin bucles, funciones propias, JavaScript, HTML, red o acceso a archivos.",
      state: "Estado persistente",
      activity: "Actividad",
      content: "Contenido",
      context: "Contexto",
      diagnostics: "Diagnósticos de validación",
      noDiagnostics: "La última validación del servidor no devolvió diagnósticos.",
      stale: "Los diagnósticos se actualizan al guardar el curso.",
      line: "Línea",
      column: "Columna",
      remove: "Eliminar script",
      removeConfirm: "¿Eliminar este script?",
      duplicateEvent: "Este bloque de evento ya existe en el script.",
      maxScripts: "El curso puede tener como máximo 100 scripts.",
      saveHint: "Guarda el curso para validar los scripts en el servidor. Los borradores pueden conservar código inválido mientras se edita.",
      disabledHint: "Los scripts deshabilitados no se ejecutan, pero también se validan antes de publicar.",
      select: "Selecciona un script",
      rename: "Un nombre descriptivo facilita encontrar el script después.",
    };
  }
  return {
    title: "Lógica CorseLight",
    subtitle: "Crie scripts limitados para o curso. O servidor valida e executa; este editor nunca executa o código-fonte.",
    scripts: "Scripts",
    add: "Novo script",
    empty: "Nenhum script ainda",
    emptyHint: "Crie um script para adicionar comportamentos ao curso.",
    name: "Nome do script",
    enabled: "Ativado",
    source: "Código-fonte · CL 0.1",
    sourceHint: "Adicione um ou mais blocos de evento. Cada evento pode aparecer apenas uma vez no mesmo script.",
    bytes: "bytes",
    limit: "O código-fonte ultrapassa o limite de 16 KiB.",
    insertEvent: "Inserir evento",
    reference: "Referência da linguagem",
    events: "Eventos disponíveis",
    natives: "Funções nativas",
    rules: "Limites do runtime",
    noLoops: "Sem loops, funções próprias, JavaScript, HTML, rede ou acesso a arquivos.",
    state: "Estado persistente",
    activity: "Atividade",
    content: "Conteúdo",
    context: "Contexto",
    diagnostics: "Diagnósticos de validação",
    noDiagnostics: "A última validação do servidor não retornou diagnósticos.",
    stale: "Os diagnósticos são atualizados ao salvar o curso.",
    line: "Linha",
    column: "Coluna",
    remove: "Excluir script",
    removeConfirm: "Excluir este script?",
    duplicateEvent: "Este bloco de evento já existe neste script.",
    maxScripts: "Um curso pode ter no máximo 100 scripts.",
    saveHint: "Salve o curso para validar os scripts no servidor. Rascunhos podem armazenar código inválido enquanto ele é editado.",
    disabledHint: "Scripts desativados não são executados, mas também são validados antes da publicação.",
    select: "Selecione um script",
    rename: "Um nome descritivo facilita encontrar o script depois.",
  };
}

export function CorseLightEditor({ scripts, diagnostics, locale, onChange }: Props) {
  const copy = useMemo(() => copyFor(locale), [locale]);
  const [selectedId, setSelectedId] = useState<string | null>(scripts[0]?.id ?? null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const selected = scripts.find((script) => script.id === selectedId) ?? null;
  const sourceBytes = selected ? new TextEncoder().encode(selected.source).byteLength : 0;

  useEffect(() => {
    if (selectedId && scripts.some((script) => script.id === selectedId)) return;
    setSelectedId(scripts[0]?.id ?? null);
  }, [scripts, selectedId]);

  const updateSelected = (patch: Partial<CorseLightScript>) => {
    if (!selected) return;
    setLocalMessage(null);
    onChange(scripts.map((script) => script.id === selected.id ? { ...script, ...patch } : script));
  };

  const addScript = () => {
    if (scripts.length >= MAX_SCRIPTS) {
      setLocalMessage(copy.maxScripts);
      return;
    }
    const id = createScriptId();
    const script: CorseLightScript = {
      id,
      name: `Script ${scripts.length + 1}`,
      language: "CL",
      languageVersion: "0.1",
      enabled: true,
      source: 'on lesson.start {\n  state.set("visited", true);\n}\n',
    };
    onChange([...scripts, script]);
    setSelectedId(id);
    setLocalMessage(null);
  };

  const removeScript = () => {
    if (!selected || !window.confirm(copy.removeConfirm)) return;
    const next = scripts.filter((script) => script.id !== selected.id);
    onChange(next);
    setSelectedId(next[0]?.id ?? null);
    setLocalMessage(null);
  };

  const appendEvent = (eventName: EventName) => {
    if (!selected) return;
    const source = selected.source.trimEnd();
    const escapedName = eventName.replace(".", "\\.");
    const duplicate = new RegExp(`\\bon\\s+${escapedName}\\s*\\{`).test(source);
    if (duplicate) {
      setLocalMessage(copy.duplicateEvent);
      return;
    }
    const snippet = eventTemplate(eventName);
    const nextSource = source ? `${source}\n\n${snippet}\n` : `${snippet}\n`;
    if (new TextEncoder().encode(nextSource).byteLength > MAX_SOURCE_BYTES) {
      setLocalMessage(copy.limit);
      return;
    }
    updateSelected({ source: nextSource });
  };

  return (
    <section className="corselight-editor" aria-labelledby="corselight-editor-title">
      <header className="corselight-editor__header">
        <div>
          <p className="corselight-editor__eyebrow">CL · 0.1</p>
          <h2 id="corselight-editor-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <span className="corselight-editor__version">AST própria · execução server-side</span>
      </header>

      <div className="corselight-editor__layout">
        <aside className="corselight-editor__scripts" aria-label={copy.scripts}>
          <div className="corselight-editor__section-heading">
            <h3>{copy.scripts}</h3>
            <span>{scripts.length}/${MAX_SCRIPTS}</span>
          </div>
          <button type="button" className="corselight-editor__add" onClick={addScript} disabled={scripts.length >= MAX_SCRIPTS}>
            <span aria-hidden="true">＋</span>{copy.add}
          </button>
          {scripts.length === 0 ? (
            <div className="corselight-editor__empty">
              <strong>{copy.empty}</strong>
              <p>{copy.emptyHint}</p>
            </div>
          ) : (
            <ul className="corselight-editor__script-list">
              {scripts.map((script) => (
                <li key={script.id}>
                  <button
                    type="button"
                    className={`corselight-editor__script-option${script.id === selectedId ? " is-active" : ""}`}
                    onClick={() => { setSelectedId(script.id); setLocalMessage(null); }}
                    aria-current={script.id === selectedId ? "true" : undefined}
                  >
                    <span className={`corselight-editor__script-dot${script.enabled ? " is-enabled" : ""}`} aria-hidden="true" />
                    <span className="corselight-editor__script-name">{script.name}</span>
                    <small>{script.enabled ? "CL" : "OFF"}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="corselight-editor__workspace">
          {selected ? (
            <>
              <div className="corselight-editor__script-settings">
                <label className="corselight-editor__name-field">
                  <span>{copy.name}</span>
                  <input
                    value={selected.name}
                    maxLength={120}
                    onChange={(event) => updateSelected({ name: event.target.value })}
                    aria-describedby="corselight-script-name-hint"
                  />
                  <small id="corselight-script-name-hint">{copy.rename}</small>
                </label>
                <label className="corselight-editor__toggle">
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(event) => updateSelected({ enabled: event.target.checked })}
                  />
                  <span>{copy.enabled}</span>
                </label>
                <button type="button" className="corselight-editor__delete" onClick={removeScript}>{copy.remove}</button>
              </div>
              {!selected.enabled && <p className="corselight-editor__disabled-hint">{copy.disabledHint}</p>}

              <div className="corselight-editor__code-heading">
                <div>
                  <h3>{copy.source}</h3>
                  <p>{copy.sourceHint}</p>
                </div>
                <span className={sourceBytes > MAX_SOURCE_BYTES ? "is-over-limit" : ""}>
                  {sourceBytes.toLocaleString(locale)} / {MAX_SOURCE_BYTES.toLocaleString(locale)} {copy.bytes}
                </span>
              </div>
              <div className="corselight-editor__event-inserter" aria-label={copy.insertEvent}>
                {EVENTS.map((eventName) => (
                  <button type="button" key={eventName} onClick={() => appendEvent(eventName)}>
                    <span aria-hidden="true">＋</span><code>{eventName}</code>
                  </button>
                ))}
              </div>
              <textarea
                className="corselight-editor__source"
                value={selected.source}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-label={copy.source}
                onChange={(event) => {
                  const nextSource = event.target.value;
                  const nextBytes = new TextEncoder().encode(nextSource).byteLength;
                  if (nextBytes > MAX_SOURCE_BYTES && nextBytes > sourceBytes) {
                    setLocalMessage(copy.limit);
                    return;
                  }
                  updateSelected({ source: nextSource });
                }}
              />
              {localMessage && <p className="corselight-editor__local-message" role="alert">{localMessage}</p>}
            </>
          ) : (
            <div className="corselight-editor__no-selection">
              <strong>{copy.select}</strong>
              <p>{copy.emptyHint}</p>
            </div>
          )}

          <section className="corselight-editor__diagnostics" aria-live="polite">
            <div className="corselight-editor__section-heading">
              <h3>{copy.diagnostics}</h3>
              <span>{diagnostics.length}</span>
            </div>
            {diagnostics.length === 0 ? (
              <p className="corselight-editor__diagnostics-empty">{copy.noDiagnostics} {copy.stale}</p>
            ) : (
              <ul>
                {diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${diagnostic.line}-${diagnostic.column}-${index}`} className={`corselight-editor__diagnostic corselight-editor__diagnostic--${diagnostic.severity}`}>
                    <span className="corselight-editor__diagnostic-code">{diagnostic.code}</span>
                    <span>{diagnostic.message}</span>
                    <small>{copy.line} {diagnostic.line}, {copy.column} {diagnostic.column}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="corselight-editor__save-hint">{copy.saveHint}</p>
        </div>

        <aside className="corselight-editor__reference" aria-label={copy.reference}>
          <h3>{copy.reference}</h3>
          <section>
            <h4>{copy.events}</h4>
            <ul>{EVENTS.map((eventName) => <li key={eventName}><code>{eventName}</code></li>)}</ul>
          </section>
          <section>
            <h4>{copy.context}</h4>
            <ul>
              <li><code>context.get(key)</code></li>
              <li><code>course.id</code></li>
              <li><code>lesson.id</code></li>
              <li><code>activity.id</code></li>
              <li><code>event.name</code></li>
              <li><code>student.locale</code></li>
            </ul>
          </section>
          <section>
            <h4>{copy.state}</h4>
            <ul>
              <li><code>state.get(key)</code></li>
              <li><code>state.set(key, value)</code></li>
              <li><code>state.reset(key)</code></li>
            </ul>
          </section>
          <section>
            <h4>{copy.activity}</h4>
            <ul>
              <li><code>activity.getAnswer()</code></li>
              <li><code>activity.isCorrect()</code></li>
              <li><code>activity.feedback(message, tone)</code></li>
            </ul>
          </section>
          <section>
            <h4>{copy.content}</h4>
            <ul>
              <li><code>content.show(nodeId)</code></li>
              <li><code>content.hide(nodeId)</code></li>
              <li><code>content.setText(nodeId, field, text)</code></li>
            </ul>
          </section>
          <section className="corselight-editor__limits">
            <h4>{copy.rules}</h4>
            <p>100 scripts · 16 KiB/source · 1.000 AST nodes · 256 calls/event</p>
            <p>{copy.noLoops}</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

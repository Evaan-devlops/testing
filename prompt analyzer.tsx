Got it—looking at your latest screenshot:

* `UserInput` starts around **2082**.
* The block that passes props to the next component ends around **2118** and includes:

  ```tsx
  setSelectedAgent={setSelectedAgent}
  setSelectedAgentConfig={setSelectedAgentConfig}
  selectedAgentConfig={selectedAgentConfig}
  ```

  That means **some child below this point** is allowed to set the agent config that pre-fills your “Configuring Agent Form”.

To see **exactly who sets it when the form opens** (and get the model value *at that moment*), do this in the **parent `Chat`** component:

---

## 1) Wrap the setter (fires when the form loads it)

**Place this right after your existing `useState` for `selectedAgentConfig`** (earlier in the file where you declared it):

```ts
// existing
const [selectedAgentConfig, _setSelectedAgentConfig] = useState<any>(null);

// ADD THIS WRAPPER just after the line above
const setSelectedAgentConfigWrapped = React.useCallback((next: any) => {
  const value = typeof next === 'function' ? next(selectedAgentConfig) : next;
  const model = value?.agent_input?.agent_model;

  // shows the model as soon as a child sets it (i.e., when the form is populated)
  alert(`[setter] model loaded for form: ${model ?? '(none)'}`);

  // optional: see who called it (DevTools → Console)
  console.trace('setSelectedAgentConfig called by:', value);

  _setSelectedAgentConfig(value);
}, [selectedAgentConfig]);
```

### Then change the prop you pass at \~**2116**

Replace:

```tsx
setSelectedAgentConfig={setSelectedAgentConfig}
```

with:

```tsx
setSelectedAgentConfig={setSelectedAgentConfigWrapped}
```

This catches **all three places** where the setter is called, and it will alert **at the moment the form receives the model** (before submit).

---

## 2) (Optional) Also observe the value that the UI binds to

If you still want a second confirmation when React is about to render the value, keep this effect near your state declarations:

```ts
React.useEffect(() => {
  const m = selectedAgentConfig?.agent_input?.agent_model;
  if (m) alert(`[state->UI] Model ready for form: ${m}`);
}, [selectedAgentConfig?.agent_input?.agent_model]);
```

That one fires when the state field the form reads actually changes.

---

## Why this works

* The **form prefill** comes from a child that fetches `get_service_params` and then calls your parent’s `setSelectedAgentConfig(...)`.
* By **wrapping the setter in the parent** and passing the wrapper down (line \~2116), you’ll see the alert **right when the child sets the config**, i.e., when the form’s **Model** value is sourced.
* The `console.trace()` shows the exact call site in DevTools so you can identify the precise component/file that’s doing it, even if it isn’t `SetPromptLibrary`.

This gives you the source immediately when the form appears, not after submit.

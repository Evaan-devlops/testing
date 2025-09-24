 React.useEffect(() => {
    const m = selectedAgentConfig?.agent_input?.agent_model;
    if (m) alert(`[state->UI] Model ready for form: ${m}`);
  }, [selectedAgentConfig?.agent_input?.agent_model]);

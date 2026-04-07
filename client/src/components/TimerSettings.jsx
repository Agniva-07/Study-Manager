export default function TimerSettings({
  settings,
  onSave,
  selectedSound,
  onSoundChange,
}) {
  const handleDurationChange = (key, value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    onSave({
      [key]: Math.max(1, parsed),
    });
  };

  return (
    <div className="glass-card-glow p-4 rounded-xl flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
        Timer Settings
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs flex flex-col gap-1" style={{ color: '#9ca3af' }}>
          Work
          <input
            type="number"
            min={1}
            value={settings.workDuration}
            onChange={(e) => handleDurationChange('workDuration', e.target.value)}
            className="input-glass py-2"
          />
        </label>

        <label className="text-xs flex flex-col gap-1" style={{ color: '#9ca3af' }}>
          Short
          <input
            type="number"
            min={1}
            value={settings.shortBreak}
            onChange={(e) => handleDurationChange('shortBreak', e.target.value)}
            className="input-glass py-2"
          />
        </label>

        <label className="text-xs flex flex-col gap-1" style={{ color: '#9ca3af' }}>
          Long
          <input
            type="number"
            min={1}
            value={settings.longBreak}
            onChange={(e) => handleDurationChange('longBreak', e.target.value)}
            className="input-glass py-2"
          />
        </label>
      </div>

      <label className="text-xs flex flex-col gap-1" style={{ color: '#9ca3af' }}>
        Ambient Sound
        <select
          value={selectedSound}
          onChange={(e) => onSoundChange(e.target.value)}
          className="input-glass py-2"
        >
          <option value="none">None</option>
          <option value="rain">Rain</option>
          <option value="lofi">Lo-fi</option>
        </select>
      </label>
    </div>
  );
}

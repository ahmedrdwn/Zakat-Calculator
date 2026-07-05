export function Nav({ pages, current, onNavigate }) {
  return (
    <nav class="tabs" role="tablist">
      {Object.entries(pages).map(([id, p]) => (
        <button
          key={id}
          class={'tab' + (id === current ? ' active' : '')}
          role="tab"
          aria-selected={id === current}
          onClick={() => onNavigate(id)}
        >
          <span style="margin-left:5px">{p.icon}</span>{p.label}
        </button>
      ))}
    </nav>
  );
}

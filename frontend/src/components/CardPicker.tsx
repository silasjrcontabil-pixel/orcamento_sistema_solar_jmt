interface CardPickerOption {
  id: number;
  title: string;
  subtitle?: string;
  highlight?: string;
}

interface CardPickerProps {
  options: CardPickerOption[];
  value: number | null | undefined;
  onChange: (id: number) => void;
  emptyLabel?: string;
  /** Quantas linhas (de 2 colunas cada) ficam visíveis antes de rolar verticalmente. */
  visibleRows?: number;
}

/** Grade de cards selecionáveis (2 colunas), com altura limitada a `visibleRows` linhas e
 * scroll vertical para o restante — usado no seletor de painéis/inversores do wizard. */
export function CardPicker({ options, value, onChange, emptyLabel, visibleRows = 4 }: CardPickerProps) {
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel ?? 'Nenhuma opção disponível.'}</p>;
  }

  return (
    <div
      className="grid grid-cols-2 gap-2 overflow-y-auto pr-1"
      style={{ maxHeight: `calc(${visibleRows} * 4.75rem + ${visibleRows - 1} * 0.5rem)` }}
    >
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`text-left p-3 rounded-md border-2 transition-colors ${
              selected ? 'border-primary bg-primary/5' : 'border-border bg-secondary hover:border-primary/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{opt.title}</span>
              {selected && <span className="text-primary text-xs shrink-0">&#10003;</span>}
            </div>
            {opt.subtitle && <div className="text-xs text-muted-foreground truncate">{opt.subtitle}</div>}
            {opt.highlight && <div className="text-xs text-primary font-semibold mt-1">{opt.highlight}</div>}
          </button>
        );
      })}
    </div>
  );
}

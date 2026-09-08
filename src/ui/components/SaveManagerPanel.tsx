import { useEffect, useState } from "react";
import type { SaveMeta } from "../../core/persistence/local-storage";

export interface SaveManagerPanelProps {
  readonly listSaves: () => SaveMeta[];
  readonly onSave: (name?: string) => void;
  readonly onLoad: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly disabled?: boolean;
}

export function SaveManagerPanel({
  listSaves,
  onSave,
  onLoad,
  onDelete,
  onRename,
  disabled = false,
}: SaveManagerPanelProps) {
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function refresh() {
    setSaves(listSaves());
  }

  useEffect(() => {
    refresh();
  }, [listSaves]);

  return (
    <div className="save-manager-panel" data-testid="save-manager">
      <h3>📁 本機存檔管理</h3>

      <div className="save-new">
        <input
          type="text"
          placeholder="存檔備註名稱（可選）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          data-testid="save-name-input"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onSave(name || undefined);
            setName("");
            refresh();
          }}
          data-testid="save-submit-btn"
        >
          儲存目前局
        </button>
      </div>

      <ul className="save-list" data-testid="save-list">
        {saves.length === 0 && (
          <li className="save-empty" data-testid="save-empty">
            目前無本機存檔
          </li>
        )}
        {saves.map((s) => (
          <li key={s.id} className="save-item" data-testid={`save-item-${s.id}`}>
            {editingId === s.id ? (
              <div className="save-edit-row">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  data-testid="save-rename-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    onRename(s.id, editName);
                    setEditingId(null);
                    refresh();
                  }}
                  data-testid="save-rename-confirm"
                >
                  確定
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  data-testid="save-rename-cancel"
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <div className="save-meta">
                  <strong className="save-title">{s.name}</strong>
                  <span className="save-sub">
                    {new Date(s.savedAt).toLocaleString()} · 共 {s.moveCount} 步
                  </span>
                </div>
                <div className="save-actions">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onLoad(s.id)}
                    data-testid={`save-load-${s.id}`}
                  >
                    載入
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(s.id);
                      setEditName(s.name);
                    }}
                    data-testid={`save-rename-${s.id}`}
                  >
                    重新命名
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(s.id);
                      refresh();
                    }}
                    data-testid={`save-delete-${s.id}`}
                  >
                    刪除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

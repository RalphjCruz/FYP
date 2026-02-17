import { useMemo, useState } from 'react';
import { useTasks } from '../hooks';
import type { TaskDraft, TaskDifficulty } from '../types';

const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const EMPTY_DRAFT: TaskDraft = {
  title: '',
  description: '',
  difficulty: 'medium',
};

export const TasksBoard = () => {
  const {
    tasks,
    stats,
    filter,
    loading,
    mutationLoading,
    error,
    setFilter,
    refreshTasks,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
  } = useTasks();

  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(EMPTY_DRAFT);

  const canCreateTask = useMemo(() => draft.title.trim().length > 0, [draft.title]);
  const canSaveEdit = useMemo(() => editDraft.title.trim().length > 0, [editDraft.title]);

  const handleCreateTask = async () => {
    if (!canCreateTask) {
      return;
    }

    const created = await createTask(draft);
    if (created) {
      setDraft(EMPTY_DRAFT);
    }
  };

  const handleStartEdit = (taskId: string, title: string, description: string, difficulty: TaskDifficulty) => {
    setEditingTaskId(taskId);
    setEditDraft({ title, description, difficulty });
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !canSaveEdit) {
      return;
    }

    const updated = await updateTask(editingTaskId, editDraft);
    if (updated) {
      setEditingTaskId(null);
      setEditDraft(EMPTY_DRAFT);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  return (
    <section className="tasks-board" aria-label="Tasks board">
      <header className="tasks-board-header">
        <div>
          <h3>Task Board</h3>
          <p>Tasks are now synced with backend and persisted in the database.</p>
        </div>

        <div className="tasks-summary">
          <span>{stats.pendingCount} pending</span>
          <span>{stats.completedCount} completed</span>
          <span>{stats.earnedXp} XP earned</span>
        </div>
      </header>

      <div className="tasks-create-card">
        <h4>Add Task</h4>
        <div className="tasks-form-grid">
          <label className="tasks-field">
            <span>Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Write your task title"
            />
          </label>

          <label className="tasks-field">
            <span>Difficulty</span>
            <select
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({ ...current, difficulty: event.target.value as TaskDifficulty }))
              }
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="tasks-field tasks-field-full">
            <span>Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              placeholder="Add context for this task"
            ></textarea>
          </label>
        </div>

        <div className="tasks-create-actions">
          <button className="btn-small" onClick={() => void handleCreateTask()} disabled={!canCreateTask || mutationLoading}>
            Add Task
          </button>
        </div>
      </div>

      <div className="tasks-toolbar">
        <div className="tasks-filter-group">
          {(['all', 'pending', 'completed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              className={`tasks-filter-button ${filter === filterOption ? 'active' : ''}`}
              onClick={() => setFilter(filterOption)}
            >
              {filterOption[0].toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
          <button className="tasks-filter-button" onClick={() => void refreshTasks()} disabled={loading || mutationLoading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="tasks-empty-state">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="tasks-empty-state">
          <p>Loading tasks...</p>
        </div>
      )}

      <div className="tasks-list">
        {!loading && tasks.length === 0 && (
          <div className="tasks-empty-state">
            <p>No tasks in this filter.</p>
          </div>
        )}

        {tasks.map((task) => {
          const isEditing = editingTaskId === task.id;

          return (
            <article key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
              {isEditing ? (
                <div className="task-edit-grid">
                  <label className="tasks-field tasks-field-full">
                    <span>Title</span>
                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>

                  <label className="tasks-field">
                    <span>Difficulty</span>
                    <select
                      value={editDraft.difficulty}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, difficulty: event.target.value as TaskDifficulty }))
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>

                  <label className="tasks-field tasks-field-full">
                    <span>Description</span>
                    <textarea
                      rows={3}
                      value={editDraft.description}
                      onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
                    ></textarea>
                  </label>

                  <div className="task-item-actions">
                    <button className="btn-small" onClick={() => void handleSaveEdit()} disabled={!canSaveEdit || mutationLoading}>
                      Save
                    </button>
                    <button className="btn-refresh" onClick={handleCancelEdit} disabled={mutationLoading}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="task-item-header">
                    <div>
                      <h4>{task.title}</h4>
                      <p>{task.description || 'No description'}</p>
                    </div>
                    <div className={`task-difficulty ${task.difficulty}`}>{DIFFICULTY_LABELS[task.difficulty]}</div>
                  </div>

                  <div className="task-meta-row">
                    <span>{task.xpReward} XP</span>
                    <span>{task.status === 'completed' ? 'Completed' : 'Pending'}</span>
                  </div>

                  <div className="task-item-actions">
                    <button
                      className="btn-small"
                      onClick={() => void toggleTaskCompletion(task.id)}
                      disabled={mutationLoading || task.status === 'completed'}
                    >
                      {task.status === 'completed' ? 'Completed' : 'Complete'}
                    </button>
                    <button
                      className="btn-refresh"
                      onClick={() => handleStartEdit(task.id, task.title, task.description, task.difficulty)}
                      disabled={mutationLoading}
                    >
                      Edit
                    </button>
                    <button className="btn-refresh" onClick={() => void deleteTask(task.id)} disabled={mutationLoading}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

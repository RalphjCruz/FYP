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

type TasksBoardProps = {
  token: string | null;
};

export const TasksBoard = ({ token }: TasksBoardProps) => {
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
  } = useTasks(token);

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

  const inputClass = 'w-full rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-3 font-sans text-base text-gb-text outline-none transition focus:ring-2 focus:ring-gb-border sm:text-lg';
  const primaryButtonClass = 'rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg';
  const dangerButtonClass = 'rounded-lg border-2 border-gb-border bg-[#b2473e] px-4 py-3 font-sans text-base font-semibold text-white transition hover:bg-[#9e3a33] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg';

  return (
    <section className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner" aria-label="Tasks board">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Task Board</h3>
          <p className="mt-2 font-sans text-base text-gb-text sm:text-lg">
            Tasks are now synced with backend and persisted in the database.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-base font-semibold text-gb-text sm:text-lg">
            {stats.pendingCount} pending
          </span>
          <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-base font-semibold text-gb-text sm:text-lg">
            {stats.completedCount} completed
          </span>
          <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-base font-semibold text-gb-text sm:text-lg">
            {stats.earnedXp} XP earned
          </span>
        </div>
      </header>

      {!token && (
        <div className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-4">
          <p className="font-sans text-base text-[#4d1212] sm:text-lg">You are not logged in. Please login to view and manage tasks.</p>
        </div>
      )}

      <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
        <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Add Task</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Write your task title"
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Difficulty</span>
            <select
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({ ...current, difficulty: event.target.value as TaskDifficulty }))
              }
              className={inputClass}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              placeholder="Add context for this task"
              className={inputClass}
            ></textarea>
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void handleCreateTask()}
            disabled={!token || !canCreateTask || mutationLoading}
          >
            Add Task
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
          {(['all', 'pending', 'completed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              type="button"
              className={`${primaryButtonClass} ${filter === filterOption ? 'bg-gb-bgDark' : ''}`}
              onClick={() => setFilter(filterOption)}
              disabled={!token}
            >
              {filterOption[0].toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void refreshTasks()}
            disabled={!token || loading || mutationLoading}
          >
            Refresh
          </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-4" role="alert">
          <p className="font-sans text-base text-[#4d1212] sm:text-lg">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
          <p className="font-sans text-base text-gb-text sm:text-lg">Loading tasks...</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {!token && (
          <div className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
            <p className="font-sans text-base text-gb-text sm:text-lg">Task actions are disabled until you login.</p>
          </div>
        )}

        {token && !loading && tasks.length === 0 && (
          <div className="rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
            <p className="font-sans text-base text-gb-text sm:text-lg">No tasks in this filter.</p>
          </div>
        )}

        {token &&
          tasks.map((task) => {
          const isEditing = editingTaskId === task.id;

          return (
            <article
              key={task.id}
              className={`rounded-lg border-2 border-gb-border p-4 ${
                task.status === 'completed' ? 'bg-gb-bg/60' : 'bg-gb-bg/80'
              }`}
            >
              {isEditing ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Title</span>
                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Difficulty</span>
                    <select
                      value={editDraft.difficulty}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, difficulty: event.target.value as TaskDifficulty }))
                      }
                      className={inputClass}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="font-sans text-base font-semibold text-gb-text sm:text-lg">Description</span>
                    <textarea
                      rows={3}
                      value={editDraft.description}
                      onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
                      className={inputClass}
                    ></textarea>
                  </label>

                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => void handleSaveEdit()}
                      disabled={!canSaveEdit || mutationLoading}
                    >
                      Save
                    </button>
                    <button type="button" className={primaryButtonClass} onClick={handleCancelEdit} disabled={mutationLoading}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">{task.title}</h4>
                      <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">{task.description || 'No description'}</p>
                    </div>
                    <div className="rounded-full border-2 border-gb-border bg-gb-panel px-3 py-1 font-sans text-base font-semibold text-gb-text sm:text-lg">
                      {DIFFICULTY_LABELS[task.difficulty]}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border-2 border-gb-border bg-gb-panel px-3 py-1 font-sans text-base text-gb-text sm:text-lg">
                      {task.xpReward} XP
                    </span>
                    <span className="rounded-full border-2 border-gb-border bg-gb-panel px-3 py-1 font-sans text-base text-gb-text sm:text-lg">
                      {task.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => void toggleTaskCompletion(task.id)}
                      disabled={mutationLoading || task.status === 'completed'}
                    >
                      {task.status === 'completed' ? 'Completed' : 'Complete'}
                    </button>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => handleStartEdit(task.id, task.title, task.description, task.difficulty)}
                      disabled={mutationLoading}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={dangerButtonClass}
                      onClick={() => void deleteTask(task.id)}
                      disabled={mutationLoading}
                    >
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

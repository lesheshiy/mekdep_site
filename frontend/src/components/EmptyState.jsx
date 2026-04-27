export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}) {
  return (
    <div className="bg-white rounded-2xl p-12 text-center space-y-4 animate-fade-in">
      <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 grid place-items-center">
        <span className="material-symbols-outlined text-3xl text-primary">
          {icon}
        </span>
      </div>
      <div>
        <p className="font-bold text-on-surface text-lg">{title}</p>
        {description && (
          <p className="text-sm text-secondary mt-1 max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

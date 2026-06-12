export default function ConfirmModal({ show, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', confirmClass = 'bg-red-600' }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 animate-scale-in">
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-medium text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${confirmClass} text-white py-2.5 rounded-lg font-medium text-sm`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

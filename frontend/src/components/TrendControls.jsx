function TrendControls({ currentIndex, total, onPrevious, onNext }) {
  return (
    <div className="trend-controls">
      <div className="trend-progress">
        <span className="trend-progress-label">Feed de tendencia</span>
        <strong>
          {currentIndex + 1}/{total}
        </strong>
      </div>

      <div className="trend-control-actions">
        <button type="button" className="trend-control-button" onClick={onPrevious}>
          Anterior
        </button>
        <button type="button" className="trend-control-button primary" onClick={onNext}>
          Siguiente
        </button>
      </div>

    </div>
  );
}

export default TrendControls;

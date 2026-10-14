

interface StageStepperProps {
  totalStages: number;
  currentStage: number; // starts at 0
  status?: 'NORMAL' | 'WARNING';
}

export function StageStepper({ totalStages, currentStage, status = 'NORMAL' }: StageStepperProps) {
  return (
    <div className="stepper" style={{ width: '100px' }}>
      {Array.from({ length: totalStages }).map((_, i) => {
        let className = 'step';
        if (i < currentStage) className += ' step-complete';
        else if (i === currentStage) {
          className += status === 'WARNING' ? ' step-warning' : ' step-active';
        }
        
        return <div key={i} className={className} />;
      })}
    </div>
  );
}

type QuizIcon = 'left' | 'right' | 'down' | 'retry' | 'plus' | 'close';

const paths: Record<QuizIcon, string> = {
  left: 'm15.5 5-7 7 7 7',
  right: 'm8.5 5 7 7-7 7',
  down: 'm5 8.5 7 7 7-7',
  retry: 'M19 8a8 8 0 1 1-5-4M19 3v5h-5',
  plus: 'M12 4v16M4 12h16',
  close: 'm5 5 14 14M19 5 5 19',
};

export function QuizButtonIcon({ icon }: { icon: QuizIcon }) {
  return <svg className="quiz-button-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[icon]}/></svg>;
}

export default function QuizButtonContent({ label, icon, iconFirst = false }: {
  label: string;
  icon: QuizIcon;
  iconFirst?: boolean;
}) {
  return <span className="quiz-button-content">
    {iconFirst && <QuizButtonIcon icon={icon}/>}
    <span className="quiz-button-label">{label}</span>
    {!iconFirst && <QuizButtonIcon icon={icon}/>}
  </span>;
}

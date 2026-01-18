import { Button } from "./ui/button";

interface PushButtonProps {
  onClick?: () => void;
  isDoneToday?: boolean;
  disabled?: boolean;
}

export const PushButton: React.FC<PushButtonProps> = ({
  onClick,
  isDoneToday = false,
  disabled = false,
}) => {
  return (
    <Button className="w-full" onClick={onClick} disabled={disabled}>
      {isDoneToday ? "push tomorrow" : "push"}
    </Button>
  );
};

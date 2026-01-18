import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

interface PushButtonProps {
  onClick?: () => void;
  isDoneToday?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  tooManyRequests?: boolean;
}

export const PushButton: React.FC<PushButtonProps> = ({
  onClick,
  isDoneToday = false,
  disabled = false,
  isLoading = false,
  tooManyRequests = false,
}) => {
  const renderContent = () => {
    if (isLoading) return <Spinner className="w-4 h-4" />;
    if (tooManyRequests) return "try again in 1 hour";
    return isDoneToday ? "push tomorrow" : "push";
  };

  return (
    <Button
      className="w-full flex items-center justify-center"
      onClick={onClick}
      disabled={disabled || isLoading || tooManyRequests}
    >
      {renderContent()}
    </Button>
  );
};

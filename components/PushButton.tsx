import { useEffect, useMemo, useState, FC } from "react";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { cn } from "@/lib/utils";

interface PushButtonProps {
  onClick?: (isSecret?: boolean) => void;
  onSecretUnlocked?: () => void;
  isDoneToday?: boolean;
  isExtraDoneToday?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  tooManyRequests?: boolean;
}

export const PushButton: FC<PushButtonProps> = ({
  onClick,
  onSecretUnlocked,
  isDoneToday = false,
  isExtraDoneToday = false,
  disabled = false,
  isLoading = false,
  tooManyRequests = false,
}) => {
  const [pressCounter, setPressCounter] = useState(0);

  useEffect(() => {
    if (!isDoneToday) setPressCounter(0);
  }, [isDoneToday]);

  useEffect(() => {
    if (isDoneToday && pressCounter === 5 && !isExtraDoneToday) {
      onSecretUnlocked?.();
    }
  }, [pressCounter, isDoneToday, isExtraDoneToday, onSecretUnlocked]);

  const isSecretUnlocked = useMemo(() => {
    return isDoneToday && pressCounter >= 5 && !isExtraDoneToday;
  }, [isDoneToday, pressCounter, isExtraDoneToday]);

  const isVisuallyDisabled =
    disabled ||
    isLoading ||
    tooManyRequests ||
    (isDoneToday && !isSecretUnlocked);

  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (tooManyRequests) return "try again in 1 hour";
    if (isSecretUnlocked) return "push anyway";
    return isDoneToday ? "push tomorrow" : "push";
  };

  const handleClick = () => {
    if (isVisuallyDisabled) {
      if (isDoneToday && !isSecretUnlocked) {
        setPressCounter((prev) => prev + 1);
      }
      return;
    }

    onClick?.(isSecretUnlocked);
  };

  return (
    <Button
      onClick={handleClick}
      aria-disabled={isVisuallyDisabled}
      className={cn(
        "w-full flex items-center justify-center select-none transition",
        isVisuallyDisabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {renderContent()}
    </Button>
  );
};

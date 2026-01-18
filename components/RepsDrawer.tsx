import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { PushButton } from "./PushButton";

interface Props {
  initialValue: number;
  onConfirm: (value: number) => void;
}

export function RepsDrawer({ initialValue, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(initialValue);
  const values = Array.from({ length: 100 }, (_, i) => i + 1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ITEM_HEIGHT = 48;

  useEffect(() => {
    if (open) {
      setSelected(initialValue);

      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: (initialValue - 1) * ITEM_HEIGHT,
            behavior: "instant",
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, initialValue]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const value = values[index];

    if (value !== undefined && value !== selected) {
      setSelected(value);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <PushButton />
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>set reps</DrawerTitle>
        </DrawerHeader>

        <div className="relative mx-auto h-48 w-full max-w-xs overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-1/2 z-10 h-12 w-full -translate-y-1/2 border-y bg-muted/20" />

          <div
            ref={scrollRef}
            className="h-full w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-hide"
            onScroll={handleScroll}
          >
            <div style={{ height: ITEM_HEIGHT * 1.5 }} className="w-full" />

            {values.map((v) => (
              <div
                key={v}
                className={`snap-center flex h-12 w-full items-center justify-center text-2xl transition-all ${
                  selected === v
                    ? "font-bold scale-110"
                    : "text-muted-foreground opacity-50"
                }`}
              >
                {v}
              </div>
            ))}

            <div style={{ height: ITEM_HEIGHT * 1.5 }} className="w-full" />
          </div>
        </div>

        <DrawerFooter className="max-w-70 mx-auto w-full">
          <DrawerClose asChild>
            <PushButton onClick={() => onConfirm(selected)} />
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

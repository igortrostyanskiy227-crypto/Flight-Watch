import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PilotControlsProps {
  flightLabel: string;
}

export function PilotControls({ flightLabel }: PilotControlsProps) {
  const [message, setMessage] = useState("Канал пилота не активен");

  return (
    <section className="rounded-md border border-line bg-panel p-3" aria-label="Pilot controls">
      <h3 className="m-0 mb-0.5 text-[12px] font-semibold text-fw-text">Pilot controls</h3>
      <p className="m-0 mb-2 text-[11px] text-fw-muted">{message}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMessage(`${flightLabel}: запрос старта отправлен`)}
          type="button"
        >
          Начать полёт
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMessage(`${flightLabel}: запрос завершения отправлен`)}
          type="button"
        >
          Завершить
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="font-bold tracking-wider"
          onClick={() => setMessage(`${flightLabel}: SOS подготовлен`)}
          type="button"
        >
          SOS
        </Button>
      </div>
    </section>
  );
}

import { useState } from "react";

interface PilotControlsProps {
  flightLabel: string;
}

export function PilotControls({ flightLabel }: PilotControlsProps) {
  const [message, setMessage] = useState("Канал пилота не активен");

  return (
    <section className="pilot-controls" aria-label="Pilot controls">
      <div>
        <h3>Pilot controls</h3>
        <p>{message}</p>
      </div>
      <div className="pilot-controls__buttons">
        <button onClick={() => setMessage(`${flightLabel}: запрос старта отправлен`)} type="button">
          Начать полёт
        </button>
        <button onClick={() => setMessage(`${flightLabel}: запрос завершения отправлен`)} type="button">
          Завершить
        </button>
        <button className="sos-button" onClick={() => setMessage(`${flightLabel}: SOS подготовлен`)} type="button">
          SOS
        </button>
      </div>
    </section>
  );
}

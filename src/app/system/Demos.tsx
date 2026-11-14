"use client";

import { useState } from "react";
import {
  BottomSheet,
  Button,
  ChecklistRow,
  ChipGroup,
  ChipLink,
  Divider,
  KeyValueRow,
  OptionCheckbox,
  PanelList,
  SegmentedControl,
  SourcePill,
  Stepper,
  UndoBar,
} from "@/components/ui";

// Live demos for the interactive components on /system. Each one holds its
// own state, the way a screen would.

export function StepperDemo() {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [seniors, setSeniors] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      <Stepper
        label="Dorośli"
        hint="18–64 lata"
        value={adults}
        min={0}
        max={12}
        onChange={setAdults}
        decreaseLabel="Mniej dorosłych"
        increaseLabel="Więcej dorosłych"
        error={adults + children + seniors === 0 ? "Dodaj co najmniej jedną osobę." : undefined}
      />
      <Stepper
        label="Dzieci"
        hint="do 17 lat"
        value={children}
        min={0}
        max={12}
        onChange={setChildren}
        decreaseLabel="Mniej dzieci"
        increaseLabel="Więcej dzieci"
      />
      <Stepper
        label="Seniorzy"
        hint="65 lat i więcej"
        value={seniors}
        min={0}
        max={12}
        onChange={setSeniors}
        decreaseLabel="Mniej seniorów"
        increaseLabel="Więcej seniorów"
      />
    </div>
  );
}

export function StepperErrorDemo() {
  const [value, setValue] = useState(0);
  return (
    <Stepper
      label="Osoby w domu"
      value={value}
      min={0}
      onChange={setValue}
      decreaseLabel="Mniej osób"
      increaseLabel="Więcej osób"
      error={value === 0 ? "Dodaj co najmniej jedną osobę." : undefined}
    />
  );
}

export function OptionsDemo() {
  const [blackout, setBlackout] = useState(true);
  const [flood, setFlood] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <OptionCheckbox
        label="Brak prądu (blackout)"
        description="Prądu nie ma kilka dni."
        checkedNote="Dodamy: latarki, baterie, powerbank, radio na baterie."
        checked={blackout}
        onChange={setBlackout}
      />
      <OptionCheckbox
        label="Powódź"
        description="Woda zalewa okolicę albo trzeba szybko wyjść z domu."
        checkedNote="Dodamy: plecak ewakuacyjny, dokumenty w woreczku, kalosze."
        checked={flood}
        onChange={setFlood}
      />
    </div>
  );
}

export function SegmentedDemo() {
  const [pets, setPets] = useState<"yes" | "no">("no");
  const [days, setDays] = useState<"3" | "7" | "14">("3");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface p-3 inset-ring inset-ring-line">
        <span className="text-body-strong">Czy macie zwierzęta?</span>
        <SegmentedControl
          label="Czy macie zwierzęta?"
          options={[
            { value: "yes", label: "Tak" },
            { value: "no", label: "Nie" },
          ]}
          value={pets}
          onChange={setPets}
        />
      </div>
      <SegmentedControl
        label="Na ile dni"
        fullWidth
        options={[
          { value: "3", label: "72 h" },
          { value: "7", label: "7 dni" },
          { value: "14", label: "14 dni" },
        ]}
        value={days}
        onChange={setDays}
      />
    </div>
  );
}

const items = [
  { id: "water", name: "Kup wodę pitną", detail: "27 l · np. 6 butelek po 5 l" },
  { id: "food", name: "Konserwy i suchy prowiant", detail: "na 3 dni dla 3 osób" },
  { id: "radio", name: "Radio na baterie", detail: "1 szt." },
] as const;

type ItemId = (typeof items)[number]["id"];

export function ChecklistDemo() {
  const [done, setDone] = useState<Set<ItemId>>(new Set(["radio"]));
  const [undo, setUndo] = useState<ItemId | null>(null);

  function toggle(id: ItemId, checked: boolean) {
    setDone((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    setUndo(checked ? null : id);
  }

  const undoItem = items.find((item) => item.id === undo);

  return (
    <div className="flex flex-col gap-3">
      <PanelList>
        {items.map((item, index) => (
          <div key={item.id}>
            {index > 0 && <Divider />}
            <ChecklistRow
              name={item.name}
              detail={item.detail}
              checked={done.has(item.id)}
              onChange={(checked) => toggle(item.id, checked)}
            />
          </div>
        ))}
      </PanelList>
      {undoItem && (
        <UndoBar
          message={`Odznaczono: ${undoItem.name}`}
          onUndo={() => toggle(undoItem.id, true)}
        />
      )}
    </div>
  );
}

export function UndoDemo() {
  const [shown, setShown] = useState(true);
  return shown ? (
    <UndoBar message="Odznaczono: Kup wodę pitną" onUndo={() => setShown(false)} />
  ) : (
    <Button variant="secondary" size="small" onClick={() => setShown(true)}>
      Pokaż ponownie
    </Button>
  );
}

export function ChipsDemo() {
  const [filter, setFilter] = useState<"all" | "missing" | "done">("all");
  return (
    <ChipGroup
      label="Pokaż"
      options={[
        { value: "all", label: "Wszystko" },
        { value: "missing", label: "Brakuje" },
        { value: "done", label: "Mam" },
      ]}
      value={filter}
      onChange={setFilter}
      after={<ChipLink href="/system">+ Dodaj sytuację</ChipLink>}
    />
  );
}

export function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="small" onClick={() => setOpen(true)}>
        Skąd te ilości?
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Skąd te ilości?">
        <p className="text-body">
          Liczymy: ilość na osobę na dzień × liczba osób × liczba dni. Wodę liczymy po 3 litry na
          osobę dziennie.
        </p>
        <div className="flex flex-col">
          <KeyValueRow label="Woda na osobę i dzień" value="3 l" />
          <KeyValueRow label="Osoby" value="3" />
          <KeyValueRow label="Dni" value="3" />
        </div>
        <SourcePill source="official" />
        <Button onClick={() => setOpen(false)}>Rozumiem</Button>
      </BottomSheet>
    </>
  );
}

export function ButtonsDemo() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setCount((value) => value + 1)}>
        Dalej{count > 0 ? ` (${count})` : ""}
      </Button>
      <Button variant="secondary">Zmień dane domu</Button>
      <Button disabledReason="Dodaj co najmniej jedną osobę, żeby przejść dalej.">Dalej</Button>
      <div className="flex flex-wrap gap-2">
        <Button size="small">Otwórz</Button>
        <Button size="small" variant="secondary">
          Edytuj
        </Button>
        <Button size="small" variant="neutral">
          Anuluj
        </Button>
        <Button size="small" variant="destructive">
          Usuń dane
        </Button>
      </div>
    </div>
  );
}

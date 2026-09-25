"use client";

import { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="p-2 rounded hover:bg-muted"
        onClick={() => setIsOpen(!isOpen)}
      >
        😊
      </button>

      {isOpen && (
        <div className="absolute z-50">
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onSelect(emoji.native);
              setIsOpen(false);
            }}
            theme="light"
            previewPosition="none"
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { AccountNode } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/accountUtils";

function TreeNode({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: AccountNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: AccountNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => onSelect(node)}
        className={`w-full flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected ? "bg-brass-100 text-navy-900" : "hover:bg-navy-50 text-ink"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={`w-4 h-4 shrink-0 flex items-center justify-center text-[10px] text-navy-500 ${
            hasChildren ? "cursor-pointer" : "opacity-0"
          }`}
        >
          {hasChildren ? (isOpen ? "▾" : "▸") : "·"}
        </span>
        <span className="font-mono text-[11px] text-navy-500 shrink-0">{node.code}</span>
        <span className={`truncate ${!node.isActive ? "line-through text-navy-300" : ""}`}>
          {node.nameOffice}
        </span>
        {node.category && depth === 0 && (
          <span className="ml-auto shrink-0 text-[10px] rounded-sm bg-navy-100 text-navy-700 px-1.5 py-0.5">
            {CATEGORY_LABELS[node.category]}
          </span>
        )}
      </button>
      {hasChildren && isOpen && (
        <div className="tree-line ml-[15px]">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: AccountNode[];
  selectedId: string | null;
  onSelect: (node: AccountNode) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-navy-300 px-2 py-4">ยังไม่มีรายการบัญชี เริ่มเพิ่มรายการระดับ 1 ได้เลย</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          expanded={expanded}
          onToggle={toggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Wand2, X, ChevronDown } from "lucide-react";
import { cn } from "./UI";

export interface FilterItem {
  id: string;
  name: string;
  color?: string;
  icon?: ReactNode;
}

interface MagicFilterDropdownProps {
  label: string;
  title: string;
  icon: ReactNode;
  items: FilterItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClear?: () => void;
  className?: string;
  buttonClassName?: string;
}

/**
 * MagicFilterDropdown: 一个具有魔法氛围的可复用下拉筛选组件
 * 
 * @param label - 默认展示的文案
 * @param title - 下拉框顶部的标题
 * @param icon - 按钮左侧的图标
 * @param items - 下拉列表项
 * @param selectedId - 当前选中的 ID
 * @param onSelect - 选中回调
 * @param onClear - 清除回调
 * @param className - 容器自定义类名
 * @param buttonClassName - 按钮自定义类名
 */
export function MagicFilterDropdown({
  label,
  title,
  icon,
  items,
  selectedId,
  onSelect,
  onClear,
  className,
  buttonClassName,
}: MagicFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all focus:ring-2 focus:ring-[#8B5A5A] outline-none group min-w-[120px]",
          (isOpen || selectedId) && !buttonClassName
            ? "bg-white/80 border-[#8B5A5A]/50 shadow-sm" 
            : !buttonClassName && "bg-white/50 border-[#4A4540]/30 hover:bg-white/80",
          buttonClassName
        )}
      >
        <span className={cn(
          "transition-colors",
          selectedId ? "text-[#8B5A5A]" : "text-[#4A4540]"
        )}>
          {icon}
        </span>
        <span className={cn(
          "font-['Cinzel'] font-bold truncate flex-1 text-left",
          selectedId ? "text-[#8B5A5A]" : "text-[#4A4540]"
        )}>
          {selectedId ? (title === "Magical Tags" ? `#${selectedItem?.name}` : selectedItem?.name) : label}
        </span>
        
        {selectedId && onClear ? (
          <X
            className="w-4 h-4 ml-1 text-[#4A4540]/60 hover:text-[#8B5A5A] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180",
            selectedId ? "text-[#8B5A5A]/60" : "text-[#4A4540]/40"
          )} />
        )}
      </button>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-0 z-[100] min-w-[200px] rounded-xl overflow-hidden"
            style={{
              background: "#eae5dd",
              border: "1px solid rgba(201,184,150,0.6)",
              boxShadow:
                "inset 0 0 18px rgba(201,184,150,0.7), 0 0 20px rgba(201,184,150,0.4), 0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {/* 装饰性顶部光晕 */}
            <div
              className="h-[2px] w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #C9B896, #FFE08A, #C9B896, transparent)",
              }}
            />
            
            <div className="py-2 px-1">
              <div className="text-xs font-['Cinzel'] text-rusty-copper/60 px-3 pb-1 border-b border-rusty-copper/20 mb-1 tracking-widest uppercase flex items-center gap-2">
                <span>✦</span>
                {title}
                <span>✦</span>
              </div>
              
              <div className="overflow-y-auto max-h-[240px] magic-scrollbar p-1 flex flex-col gap-1">
                {items.length > 0 ? (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 flex items-center gap-2 transition-all rounded-lg",
                        selectedId === item.id
                          ? "bg-faded-gold/40 shadow-[inset_0_0_8px_rgba(201,184,150,0.3)]"
                          : "hover:bg-faded-gold/20"
                      )}
                    >
                      {item.color && (
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/40 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                      <span className={cn(
                        "truncate font-['Cinzel'] text-base",
                        selectedId === item.id ? "text-vintage-burgundy font-bold" : "text-rusty-copper"
                      )}>
                        {title === "Magical Tags" ? `#${item.name}` : item.name}
                      </span>
                      {selectedId === item.id && (
                        <Wand2 className="w-3.5 h-3.5 ml-auto text-faded-gold flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-rusty-copper/60 text-sm font-['Cinzel'] italic">
                    No options available
                  </div>
                )}
              </div>
            </div>

            {/* 装饰性底部光晕 */}
            <div
              className="h-[2px] w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #C9B896, #FFE08A, #C9B896, transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

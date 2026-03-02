import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const VALUES_CATEGORIES = [
  { id: "health", label: "Health & Well Being" },
  { id: "career", label: "Career" },
  { id: "money", label: "Money" },
  { id: "personalGrowth", label: "Personal Growth" },
  { id: "funRecreation", label: "Fun & Recreation" },
  { id: "physicalEnvironment", label: "Physical Environment" },
  { id: "romance", label: "Significant Other" },
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
] as const;

export type ValuesRatings = Record<string, number>;

interface ValuesWheelChartProps {
  ratings: ValuesRatings;
  previousRatings?: ValuesRatings;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (id: string, value: number) => void;
  showLabels?: boolean;
  className?: string;
}

export function ValuesWheelChart({
  ratings,
  previousRatings,
  size = 320,
  interactive = false,
  onRatingChange,
  showLabels = true,
  className = "",
}: ValuesWheelChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - (showLabels ? 50 : 20);
  const rings = 10;
  const categories = VALUES_CATEGORIES;
  const sliceAngle = (2 * Math.PI) / categories.length;

  const getPoint = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2),
  });

  const getPolygonPoints = (ratingsObj: ValuesRatings) => {
    return categories
      .map((cat, i) => {
        const value = ratingsObj[cat.id] || 0;
        const radius = (value / 10) * maxRadius;
        const angle = i * sliceAngle;
        const point = getPoint(angle, radius);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  };

  const handleSliceClick = (catId: string) => {
    if (!interactive || !onRatingChange) return;
    const current = ratings[catId] || 0;
    const next = current >= 10 ? 1 : current + 1;
    onRatingChange(catId, next);
  };

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!interactive || !onRatingChange || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - cx;
      const dy = y - cy;
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;
      const sliceIndex = Math.floor(angle / sliceAngle);
      const cat = categories[sliceIndex % categories.length];
      const distance = Math.sqrt(dx * dx + dy * dy);
      const value = Math.max(1, Math.min(10, Math.round((distance / maxRadius) * 10) || 1));
      onRatingChange(cat.id, value);
    },
    [interactive, onRatingChange, cx, cy, maxRadius, sliceAngle, categories]
  );

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        onClick={handleSvgClick}
        className={interactive ? "cursor-pointer" : ""}
        data-testid="svg-values-wheel"
      >
        {[...Array(rings)].map((_, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={((i + 1) / rings) * maxRadius}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth={i === rings - 1 ? 1.5 : 0.5}
            opacity={0.4}
          />
        ))}

        {categories.map((_, i) => {
          const angle = i * sliceAngle;
          const endPoint = getPoint(angle, maxRadius);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}

        {previousRatings && (
          <polygon
            points={getPolygonPoints(previousRatings)}
            fill="hsl(var(--muted-foreground))"
            fillOpacity={0.08}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.5}
          />
        )}

        <polygon
          points={getPolygonPoints(ratings)}
          fill="hsl(var(--primary))"
          fillOpacity={0.15}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />

        {categories.map((cat, i) => {
          const value = ratings[cat.id] || 0;
          const radius = (value / 10) * maxRadius;
          const angle = i * sliceAngle;
          const point = getPoint(angle, radius);
          return (
            <circle
              key={cat.id}
              cx={point.x}
              cy={point.y}
              r={hoveredSlice === cat.id ? 5 : 4}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
              onMouseEnter={() => setHoveredSlice(cat.id)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={interactive ? "cursor-pointer" : ""}
              data-testid={`dot-value-${cat.id}`}
            />
          );
        })}

        {showLabels &&
          categories.map((cat, i) => {
            const angle = i * sliceAngle;
            const labelRadius = maxRadius + 28;
            const point = getPoint(angle, labelRadius);
            const isHovered = hoveredSlice === cat.id;
            return (
              <g key={cat.id}>
                <text
                  x={point.x}
                  y={point.y - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`fill-current text-[9px] font-medium transition-colors ${isHovered ? "text-primary" : "text-muted-foreground"}`}
                  data-testid={`label-value-${cat.id}`}
                >
                  {cat.label}
                </text>
                <text
                  x={point.x}
                  y={point.y + 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-current text-primary text-[10px] font-bold"
                >
                  {ratings[cat.id] || 0}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}

interface ValuesWheelInputProps {
  ratings: ValuesRatings;
  onRatingsChange: (ratings: ValuesRatings) => void;
}

export function ValuesWheelInput({ ratings, onRatingsChange }: ValuesWheelInputProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleRatingChange = (id: string, value: number) => {
    onRatingsChange({ ...ratings, [id]: value });
  };

  const allRated = VALUES_CATEGORIES.every((cat) => (ratings[cat.id] || 0) >= 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <ValuesWheelChart
          ratings={ratings}
          size={300}
          interactive={true}
          onRatingChange={handleRatingChange}
          showLabels={true}
        />
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-xs text-muted-foreground text-center">
          Tap each area or use the sliders to rate where you are today (1 = needs work, 10 = thriving)
        </p>
        <div className="space-y-2.5">
          {VALUES_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeCategory === cat.id ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
              }`}
              onMouseEnter={() => setActiveCategory(cat.id)}
              onMouseLeave={() => setActiveCategory(null)}
            >
              <span className="text-xs font-medium w-32 shrink-0">{cat.label}</span>
              <Slider
                value={[ratings[cat.id] || 1]}
                onValueChange={([v]) => handleRatingChange(cat.id, v)}
                min={1}
                max={10}
                step={1}
                className="flex-1"
                data-testid={`slider-value-${cat.id}`}
              />
              <span className="text-xs font-bold w-6 text-right text-primary" data-testid={`text-value-rating-${cat.id}`}>
                {ratings[cat.id] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {allRated && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-center text-primary font-medium"
        >
          All areas rated — your values wheel is ready!
        </motion.p>
      )}
    </div>
  );
}

interface ValuesWheelProgressProps {
  current: ValuesRatings;
  history: Array<{ ratings: ValuesRatings; date: string; sessionId?: string }>;
  onUpdate?: (ratings: ValuesRatings) => void;
  isUpdating?: boolean;
}

export function ValuesWheelProgress({ current, history, onUpdate, isUpdating }: ValuesWheelProgressProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editRatings, setEditRatings] = useState<ValuesRatings>(current);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  const previousRatings = history.length > 0 ? history[history.length - 1].ratings : undefined;
  const displayPrevious = selectedHistoryIndex !== null ? history[selectedHistoryIndex]?.ratings : previousRatings;

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editRatings);
      setIsEditing(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" data-testid="text-values-wheel-title">Your Values Wheel</h3>
        {onUpdate && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => { setEditRatings(current); setIsEditing(true); }} data-testid="button-update-values">
            Update Ratings
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} data-testid="button-cancel-values">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isUpdating} data-testid="button-save-values">
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ValuesWheelInput ratings={editRatings} onRatingsChange={setEditRatings} />
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-center">
              <ValuesWheelChart
                ratings={current}
                previousRatings={displayPrevious}
                size={300}
                showLabels={true}
              />
            </div>
            {previousRatings && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-muted-foreground/50 inline-block" style={{ borderTop: "1.5px dashed" }} /> Previous
                </span>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-primary inline-block" /> Current
                </span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && !isEditing && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground font-medium">Journey History ({history.length} update{history.length !== 1 ? "s" : ""})</p>
          <div className="flex gap-1.5 flex-wrap">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => setSelectedHistoryIndex(selectedHistoryIndex === i ? null : i)}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  selectedHistoryIndex === i
                    ? "bg-primary text-primary-foreground"
                    : entry.sessionId
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                data-testid={`button-history-${i}`}
                title={entry.sessionId ? "Updated after coaching session" : "Self-assessment"}
              >
                {entry.sessionId && <span className="text-[10px]">🎯</span>}
                {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </button>
            ))}
          </div>
          {history.some(e => e.sessionId) && (
            <p className="text-[10px] text-muted-foreground">🎯 = updated after coaching session</p>
          )}
        </div>
      )}
    </Card>
  );
}

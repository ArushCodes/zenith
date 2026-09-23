import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  GraduationCap,
  School,
  BookOpen,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatBatchLabel, type BatchNode } from "@/lib/batches";

type Props = {
  batches: BatchNode[];
  selectedBatchId: string;
  onSelectBatchId: (id: string) => void;
  className?: string;
  compact?: boolean;
};

export function HierarchyBatchSelector({
  batches,
  selectedBatchId,
  onSelectBatchId,
  className = "",
  compact = false,
}: Props) {
  // Find current batch if already selected
  const activeBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId],
  );

  // Hierarchy structure built dynamically from batch nodes
  const hierarchy = useMemo(() => {
    const unis: {
      id: string;
      name: string;
      short: string;
      schools: {
        id: string;
        name: string;
        short: string;
        programmes: {
          id: string;
          name: string;
          short: string;
          batches: BatchNode[];
        }[];
      }[];
    }[] = [];

    for (const b of batches) {
      const uName = b.institution_name || "Manipal Academy of Higher Education";
      const uShort = (b.institution_slug || "MAHE").toUpperCase();
      let uni = unis.find((u) => u.name === uName);
      if (!uni) {
        uni = { id: uName, name: uName, short: uShort, schools: [] };
        unis.push(uni);
      }

      const sName = b.school_name || "T. A. Pai Management Institute";
      const sShort = (b.school_slug || "TAPMI").toUpperCase();
      let school = uni.schools.find((s) => s.name === sName);
      if (!school) {
        school = { id: sName, name: sName, short: sShort, programmes: [] };
        uni.schools.push(school);
      }

      const pName = b.programme_name || "Integrated Programme in Management";
      const pShort = (b.programme_slug || "IPM").toUpperCase();
      let prog = school.programmes.find((p) => p.name === pName);
      if (!prog) {
        prog = { id: pName, name: pName, short: pShort, batches: [] };
        school.programmes.push(prog);
      }

      prog.batches.push(b);
    }

    // Sort batches within programmes
    for (const u of unis) {
      for (const s of u.schools) {
        for (const p of s.programmes) {
          p.batches.sort((a, b) => a.name.localeCompare(b.name));
        }
      }
    }

    return unis;
  }, [batches]);

  // Selection states for each level
  const [selectedUni, setSelectedUni] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedProg, setSelectedProg] = useState<string>("");

  // Sync state if an initial or changed selectedBatchId is provided
  useEffect(() => {
    if (activeBatch) {
      setSelectedUni(activeBatch.institution_name || hierarchy[0]?.name || "");
      setSelectedSchool(activeBatch.school_name || "");
      setSelectedProg(activeBatch.programme_name || "");
    } else if (hierarchy.length > 0 && !selectedUni) {
      // Auto-set the top university if only 1 exists
      const firstUni = hierarchy[0];
      if (hierarchy.length === 1 && firstUni) {
        setSelectedUni(firstUni.name);
        const firstSchool = firstUni.schools[0];
        if (firstUni.schools.length === 1 && firstSchool) {
          setSelectedSchool(firstSchool.name);
          const firstProg = firstSchool.programmes[0];
          if (firstSchool.programmes.length === 1 && firstProg) {
            setSelectedProg(firstProg.name);
          }
        }
      }
    }
  }, [activeBatch, hierarchy]);

  // Current level options
  const currentUniObj = hierarchy.find((u) => u.name === selectedUni);
  const schoolOptions = currentUniObj?.schools || [];
  const currentSchoolObj = schoolOptions.find((s) => s.name === selectedSchool);
  const progOptions = currentSchoolObj?.programmes || [];
  const currentProgObj = progOptions.find((p) => p.name === selectedProg);
  const batchOptions = currentProgObj?.batches || [];

  function handleUniSelect(uniName: string) {
    setSelectedUni(uniName);
    const u = hierarchy.find((item) => item.name === uniName);
    const firstSchool = u?.schools[0];
    if (u && u.schools.length === 1 && firstSchool) {
      setSelectedSchool(firstSchool.name);
      const firstProg = firstSchool.programmes[0];
      if (firstSchool.programmes.length === 1 && firstProg) {
        setSelectedProg(firstProg.name);
      } else {
        setSelectedProg("");
      }
    } else {
      setSelectedSchool("");
      setSelectedProg("");
    }
    onSelectBatchId("");
  }

  function handleSchoolSelect(schoolName: string) {
    setSelectedSchool(schoolName);
    const s = schoolOptions.find((item) => item.name === schoolName);
    const firstProg = s?.programmes[0];
    if (s && s.programmes.length === 1 && firstProg) {
      setSelectedProg(firstProg.name);
    } else {
      setSelectedProg("");
    }
    onSelectBatchId("");
  }

  function handleProgSelect(progName: string) {
    setSelectedProg(progName);
    onSelectBatchId("");
  }

  function resetAll() {
    if (hierarchy.length > 1) {
      setSelectedUni("");
      setSelectedSchool("");
      setSelectedProg("");
    } else {
      setSelectedSchool(hierarchy[0]?.schools[0]?.name || "");
      setSelectedProg(hierarchy[0]?.schools[0]?.programmes[0]?.name || "");
    }
    onSelectBatchId("");
  }

  return (
    <div className={`flex flex-col gap-3.5 rounded-2xl bg-surface2/50 p-4 sm:p-5 ring-1 ring-border ${className}`}>
      {/* Header & Reset */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-cyan" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
            Academic Hierarchy
          </span>
        </div>
        {selectedBatchId && (
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1 font-mono text-[10px] text-faint hover:text-ink transition-colors"
          >
            <RotateCcw className="size-2.5" />
            Reset
          </button>
        )}
      </div>

      {/* Breadcrumb Path Preview */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-medium ring-1 ring-border">
        <span
          className={`cursor-pointer transition-colors ${
            selectedUni ? "text-cyan font-semibold hover:underline" : "text-faint"
          }`}
          onClick={() => setSelectedSchool("")}
        >
          {currentUniObj?.short || "1. University"}
        </span>
        <ChevronRight className="size-3 text-faint shrink-0" />
        <span
          className={`cursor-pointer transition-colors ${
            selectedSchool ? "text-cyan font-semibold hover:underline" : "text-faint"
          }`}
          onClick={() => setSelectedProg("")}
        >
          {currentSchoolObj?.short || "2. Institution"}
        </span>
        <ChevronRight className="size-3 text-faint shrink-0" />
        <span
          className={`cursor-pointer transition-colors ${
            selectedProg ? "text-cyan font-semibold hover:underline" : "text-faint"
          }`}
          onClick={() => onSelectBatchId("")}
        >
          {currentProgObj?.short || "3. Programme"}
        </span>
        <ChevronRight className="size-3 text-faint shrink-0" />
        <span
          className={
            activeBatch ? "text-ink font-bold" : "text-faint"
          }
        >
          {activeBatch ? formatBatchLabel(activeBatch).code : "4. Batch"}
        </span>
      </div>

      {/* Step 1: University */}
      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim flex items-center justify-between">
          <span>1. University / Board</span>
          {selectedUni && <span className="text-cyan font-bold">Selected</span>}
        </label>
        <div className="grid grid-cols-1 gap-2">
          {hierarchy.map((u) => {
            const isSelected = selectedUni === u.name;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleUniSelect(u.name)}
                className={`flex items-center justify-between gap-3 rounded-xl p-2.5 sm:p-3 text-left transition-all outline-none ${
                  isSelected
                    ? "bg-cyan/10 ring-2 ring-cyan text-ink font-medium"
                    : "bg-surface ring-1 ring-border text-dim hover:text-ink hover:bg-surface2 hover:ring-cyan/30"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-lg ${
                    isSelected ? "bg-cyan text-ground" : "bg-surface2 text-faint"
                  }`}>
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold leading-tight truncate">
                      {u.short}
                    </p>
                    <p className="font-mono text-[10px] text-faint truncate">{u.name}</p>
                  </div>
                </div>
                {isSelected && <Check className="size-4 text-cyan shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Institution / College */}
      {selectedUni && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1.5"
        >
          <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim flex items-center justify-between">
            <span>2. College / School</span>
            {selectedSchool && <span className="text-cyan font-bold">Selected</span>}
          </label>
          <div className="grid grid-cols-1 gap-2">
            {schoolOptions.map((s) => {
              const isSelected = selectedSchool === s.name;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSchoolSelect(s.name)}
                  className={`flex items-center justify-between gap-3 rounded-xl p-2.5 sm:p-3 text-left transition-all outline-none ${
                    isSelected
                      ? "bg-cyan/10 ring-2 ring-cyan text-ink font-medium"
                      : "bg-surface ring-1 ring-border text-dim hover:text-ink hover:bg-surface2 hover:ring-cyan/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-lg ${
                      isSelected ? "bg-cyan text-ground" : "bg-surface2 text-faint"
                    }`}>
                      <School className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold leading-tight truncate">
                        {s.short}
                      </p>
                      <p className="font-mono text-[10px] text-faint truncate">{s.name}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-cyan shrink-0" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Step 3: Programme */}
      {selectedSchool && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1.5"
        >
          <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim flex items-center justify-between">
            <span>3. Degree / Programme</span>
            {selectedProg && <span className="text-cyan font-bold">Selected</span>}
          </label>
          <div className="grid grid-cols-1 gap-2">
            {progOptions.map((p) => {
              const isSelected = selectedProg === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProgSelect(p.name)}
                  className={`flex items-center justify-between gap-3 rounded-xl p-2.5 sm:p-3 text-left transition-all outline-none ${
                    isSelected
                      ? "bg-cyan/10 ring-2 ring-cyan text-ink font-medium"
                      : "bg-surface ring-1 ring-border text-dim hover:text-ink hover:bg-surface2 hover:ring-cyan/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-lg ${
                      isSelected ? "bg-cyan text-ground" : "bg-surface2 text-faint"
                    }`}>
                      <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold leading-tight truncate">
                        {p.short}
                      </p>
                      <p className="font-mono text-[10px] text-faint truncate">{p.name}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-cyan shrink-0" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Step 4: Batch / Year */}
      {selectedProg && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 pt-1"
        >
          <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim flex items-center justify-between">
            <span>4. Choose Your Batch</span>
            {selectedBatchId && (
              <span className="text-cyan font-bold flex items-center gap-1">
                <Check className="size-3" /> Batch Ready
              </span>
            )}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {batchOptions.map((b) => {
              const info = formatBatchLabel(b);
              const isSelected = selectedBatchId === b.id;
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectBatchId(b.id)}
                  className={`relative flex flex-col justify-between rounded-xl p-3 text-left transition-all outline-none ${
                    isSelected
                      ? "bg-cyan/15 ring-2 ring-cyan text-ink shadow-md shadow-cyan/10"
                      : "bg-surface ring-1 ring-border text-dim hover:text-ink hover:bg-surface2 hover:ring-cyan/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-display text-base font-bold tracking-tight text-ink">
                      {info.code}
                    </span>
                    {isSelected ? (
                      <span className="grid size-4 place-items-center rounded-full bg-cyan text-ground">
                        <Check className="size-3" />
                      </span>
                    ) : (
                      <span className="size-4 rounded-full border border-border" />
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="font-mono text-xs font-bold text-cyan">
                      {info.years || "General"}
                    </p>
                    <p className="font-mono text-[10px] text-faint truncate mt-0.5">
                      {info.code === "IPM 1"
                        ? "1st Year · 2026–2031"
                        : info.code === "IPM 2"
                        ? "2nd Year · 2025–2030"
                        : "3rd Year · 2024–2029"}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {selectedBatchId && activeBatch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-1 flex items-center gap-2 rounded-xl bg-cyan/10 px-3 py-2 text-xs font-medium text-cyan ring-1 ring-cyan/30"
            >
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">
                Enrolling in: <strong>MAHE › TAPMI › IPM › {formatBatchLabel(activeBatch).code}</strong>
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

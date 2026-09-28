import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      duration={2000}
      visibleToasts={1}
      closeButton={false}
      toastOptions={{
        duration: 2000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface/95 group-[.toaster]:text-ink group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-3.5 group-[.toaster]:font-sans text-xs sm:text-sm border ring-1 ring-border/50",
          description: "group-[.toast]:text-dim font-sans text-xs",
          actionButton: "group-[.toast]:bg-cyan group-[.toast]:text-white group-[.toast]:font-semibold group-[.toast]:rounded-xl px-3 py-1.5",
          cancelButton: "group-[.toast]:bg-surface2 group-[.toast]:text-dim group-[.toast]:font-semibold group-[.toast]:rounded-xl px-3 py-1.5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };


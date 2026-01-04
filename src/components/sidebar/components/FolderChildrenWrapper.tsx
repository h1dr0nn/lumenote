import { motion } from "framer-motion";

interface FolderChildrenWrapperProps {
    isExpanded: boolean;
    children: React.ReactNode;
}

/**
 * A wrapper component that animates the folder children expand/collapse
 * using framer-motion with opacity and translateY instead of height
 * to avoid clipping issues.
 */
export const FolderChildrenWrapper = ({ isExpanded, children }: FolderChildrenWrapperProps) => {
    return (
        <motion.div
            initial={false}
            animate={{
                height: isExpanded ? 'auto' : 0,
                opacity: isExpanded ? 1 : 0,
            }}
            transition={{
                height: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
                opacity: { duration: 0.15, ease: "easeOut" },
            }}
            style={{ overflow: isExpanded ? 'visible' : 'hidden' }}
            className="border-l border-border-muted/30 ml-5"
        >
            {children}
        </motion.div>
    );
};

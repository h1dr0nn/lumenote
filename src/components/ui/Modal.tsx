import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = '500px' }: ModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    
                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="bg-app-surface border border-border-muted rounded-2xl shadow-2xl pointer-events-auto w-full overflow-hidden flex flex-col"
                            style={{ maxWidth }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted/50 bg-app-surface/50">
                                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-tight">
                                    {title}
                                </h3>
                                <button 
                                    onClick={onClose}
                                    className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-app-hover transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-6 overflow-y-auto max-h-[80vh]">
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="px-6 py-4 border-t border-border-muted/50 bg-app-surface/50 flex justify-end gap-3">
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

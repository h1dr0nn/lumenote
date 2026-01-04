import { useSortable } from "@dnd-kit/sortable";

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
    disableAnimation?: boolean;
    disabled?: boolean;
}

export const SortableItem = ({ id, children, disableAnimation = false, disabled = false }: SortableItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
    
    const style: React.CSSProperties = {
        transform: (!disableAnimation && transform) ? `translate(0, ${transform.y}px)` : undefined,
        transition: transition || (!disableAnimation ? 'transform 0.2s ease' : undefined),
        opacity: isDragging ? 0 : 1,
        position: 'relative',
        cursor: disabled ? 'default' : 'grab',
    };
    
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
};

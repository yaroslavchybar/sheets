import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface TagsInputProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string[]
    onValueChange: (value: string[]) => void
    placeholder?: string
}

const TagsInput = React.forwardRef<HTMLInputElement, TagsInputProps>(
    ({ className, value, onValueChange, placeholder, ...props }, ref) => {
        const [inputValue, setInputValue] = React.useState("")
        const inputRef = React.useRef<HTMLInputElement>(null)

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            // Add tag on Enter or comma
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault()
                const newTag = inputValue.trim().replace(/,$/, "")
                if (newTag && !value.includes(newTag)) {
                    onValueChange([...value, newTag])
                }
                setInputValue("")
            } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
                // Remove last tag on empty backspace
                onValueChange(value.slice(0, -1))
            }
        }

        const removeTag = (indexToRemove: number) => {
            onValueChange(value.filter((_, index) => index !== indexToRemove))
        }

        // Optional: paste comma or newline separated tags
        const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData("text")
            const newTags = pastedText
                .split(/[\n,]/)
                .map((t) => t.trim())
                .filter((t) => t && !value.includes(t))

            if (newTags.length > 0) {
                onValueChange([...value, ...newTags])
            }
        }

        return (
            <div
                className={cn(
                    "flex min-h-[400px] w-full flex-wrap items-start gap-2 rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto content-start",
                    className
                )}
                onClick={() => inputRef.current?.focus()}
                {...props}
            >
                {value.map((tag, index) => (
                    <Badge
                        key={`${tag}-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-2.5 py-1 text-sm bg-[#2b2b2b] text-[#e0e0e0] hover:bg-[#3b3b3b] border-none font-normal"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                removeTag(index)
                            }}
                            className="ml-0.5 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-white/20 p-0.5 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </Badge>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={() => {
                        const newTag = inputValue.trim()
                        if (newTag && !value.includes(newTag)) {
                            onValueChange([...value, newTag])
                            setInputValue("")
                        }
                    }}
                    className="flex-1 bg-transparent py-1 outline-none placeholder:text-muted-foreground min-w-[120px]"
                    placeholder={value.length === 0 ? placeholder : ""}
                />
            </div>
        )
    }
)
TagsInput.displayName = "TagsInput"

export { TagsInput }

import React, { useState, useRef, useEffect } from "react";
import { type Toast, ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { useScrollLock } from "~~/hooks/useScrollLock";

type NotificationProps = {
  content: React.ReactNode;
  status: "success" | "info" | "loading" | "error" | "warning";
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

type NotificationOptions = {
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

const ENUM_STATUSES = {
  success: <CheckCircleIcon className="w-7 text-success" />,
  loading: <span className="w-6 loading loading-spinner"></span>,
  error: <ExclamationCircleIcon className="w-7 text-error" />,
  info: <InformationCircleIcon className="w-7 text-info" />,
  warning: <ExclamationTriangleIcon className="w-7 text-warning" />,
};

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = "top-center";

const ToastContent = ({
  t,
  content,
  status,
  icon,
  position,
}: NotificationProps & { t: Toast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useScrollLock(isExpanded);

  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = parseInt(
        window.getComputedStyle(contentRef.current).lineHeight,
      );
      const totalHeight = contentRef.current.scrollHeight;
      const numberOfLines = totalHeight / lineHeight;
      setNeedsExpand(numberOfLines > 10);
    }
  }, [content]);

  return (
    <div
      className={`flex flex-col max-w-sm rounded-xl shadow-center shadow-accent bg-base-200 md:p-4 p-2 transform-gpu relative transition-all duration-500 ease-in-out
      ${
        position?.substring(0, 3) === "top"
          ? `hover:translate-y-1 ${t.visible ? "top-0" : "-top-96"}`
          : `hover:-translate-y-1 ${t.visible ? "bottom-0" : "-bottom-96"}`
      }`}
    >
      <div className="flex flex-row items-start space-x-2">
        <div className="leading-[0] self-center">
          {icon ? icon : ENUM_STATUSES[status]}
        </div>

        <div className="flex-1 min-w-0 md:max-w-max max-w-[230px]">
          <div
            ref={contentRef}
            className={`break-words whitespace-pre-line ${icon ? "mt-1" : ""}
              ${
                isExpanded
                  ? "max-h-[600px] overflow-y-auto"
                  : "line-clamp-10 overflow-hidden"
              }`}
          >
            {content}
          </div>
        </div>

        <div
          className={`cursor-pointer text-lg shrink-0 ${icon ? "mt-1" : ""}`}
          onClick={() => toast.dismiss(t.id)}
        >
          <XMarkIcon
            className="w-6 cursor-pointer"
            onClick={() => toast.remove(t.id)}
          />
        </div>
      </div>

      {needsExpand && (
        <div className="flex items-center justify-center mt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            {!isExpanded ? "View Details" : "Close Details"}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Custom Notification
 */
const Notification = ({
  content,
  status,
  duration = DEFAULT_DURATION,
  icon,
  position = DEFAULT_POSITION,
}: NotificationProps) => {
  return toast.custom(
    (t: Toast) => (
      <ToastContent
        t={t}
        content={content}
        status={status}
        icon={icon}
        position={position}
        duration={duration}
      />
    ),
    {
      duration: status === "loading" ? Infinity : duration,
      position,
    },
  );
};

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "success", ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "info", ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "warning", ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    const logId = `error-${Date.now()}`;
    
    // Handle different error types and extract meaningful information
    let displayContent: React.ReactNode;
    let consoleError: any = content;
    let errorMessage = "";
    let errorDetails: string | undefined;
    
    // Extract error information from various error types
    if (content instanceof Error) {
      consoleError = content;
      errorMessage = content.message;
      errorDetails = content.stack;
    } else if (typeof content === "object" && content !== null) {
      consoleError = content;
      
      // Try to extract message from various error object structures
      if ("message" in content) {
        errorMessage = String((content as any).message);
      } else if ("error" in content && typeof (content as any).error === "string") {
        errorMessage = (content as any).error;
      } else if ("error" in content && typeof (content as any).error === "object") {
        errorMessage = (content as any).error.message || JSON.stringify((content as any).error);
      } else if ("reason" in content) {
        errorMessage = String((content as any).reason);
      } else if ("data" in content && typeof (content as any).data === "object" && "message" in (content as any).data) {
        errorMessage = String((content as any).data.message);
      }
      
      // If no message extracted, try to stringify the object
      if (!errorMessage) {
        try {
          errorMessage = JSON.stringify(content, null, 2);
        } catch {
          errorMessage = "Unknown error";
        }
      }
      
      // Try to get additional details
      if ("data" in content) {
        try {
          errorDetails = JSON.stringify((content as any).data, null, 2);
        } catch {
          // ignore
        }
      }
    } else if (typeof content === "string") {
      errorMessage = content;
    } else if (React.isValidElement(content)) {
      // If it's already valid JSX, use it directly
      displayContent = content;
      console.error(`[${logId}]`, content);
      return Notification({
        content: displayContent,
        status: "error",
        duration: options?.duration || 8000,
        ...options,
      });
    } else {
      // Fallback for other types
      try {
        errorMessage = JSON.stringify(content);
      } catch {
        errorMessage = "An unknown error occurred";
      }
    }

    // Clean up common error patterns for better UX
    errorMessage = errorMessage
      .replace(/^Error:\s*/i, "")
      .replace(/Contract error:/i, "Contract Error:")
      .trim();

    // Create user-friendly display content
    displayContent = (
      <div>
        <div className="font-bold mb-1">❌ Error</div>
        <div className="text-sm break-words">{errorMessage}</div>
        {errorDetails && (
          <details className="mt-2">
            <summary className="text-xs cursor-pointer text-blue-500 hover:text-blue-700">
              View Details
            </summary>
            <pre className="text-xs mt-1 p-2 bg-base-300 rounded overflow-x-auto max-h-32">
              {errorDetails}
            </pre>
          </details>
        )}
        <div className="text-xs mt-2 opacity-70">
          <a
            href="#console"
            className="text-blue-500 underline hover:text-blue-700"
            onClick={(e) => {
              e.preventDefault();
              console.log(`[${logId}] Full error details:`, consoleError);
            }}
          >
            Log ID: {logId}
          </a>
        </div>
      </div>
    );

    // Log comprehensive error details to console
    console.group(`[${logId}] Error Details`);
    console.error("Error:", consoleError);
    if (errorMessage) console.error("Message:", errorMessage);
    if (errorDetails) console.error("Details:", errorDetails);
    console.trace("Stack trace:");
    console.groupEnd();

    return Notification({
      content: displayContent,
      status: "error",
      duration: options?.duration || 8000, // Longer duration for errors
      ...options,
    });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "loading", ...options });
  },
  remove: (toastId: string) => {
    toast.remove(toastId);
  },
};

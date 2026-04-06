import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DeviceMockupProps {
  type?: "phone";
  contentType?: "ugc" | "clip";
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function DeviceMockup({
  type = "phone",
  contentType = "ugc",
  animated = false,
  className,
  children,
}: DeviceMockupProps) {
  const isUGC = contentType === "ugc";
  
  return (
    <motion.div
      initial={animated ? { y: 20, opacity: 0 } : false}
      animate={animated ? { y: 0, opacity: 1 } : false}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl",
        className
      )}
    >
      <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-20"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
      <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
      
      <div className={cn(
        "rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white dark:bg-gray-900 relative",
        isUGC ? "ring-2 ring-ugc-primary/50" : "ring-2 ring-clip-primary/50"
      )}>
        {children || (
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {isUGC ? (
                <div className="text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-ugc-primary/20 mx-auto mb-4 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-ugc-primary"></div>
                  </div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="absolute bottom-10 left-4 right-4 h-16 bg-clip-primary/20 backdrop-blur-md rounded-xl border border-clip-primary/30 flex items-center justify-center">
                    <span className="text-clip-primary font-bold text-sm">BANNER AD</span>
                  </div>
                </div>
              )}
            </div>
            <div className="h-16 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-around items-center px-4">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800"></div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary"></div>
              </div>
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800"></div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

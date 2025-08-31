"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Delete, RotateCcw } from "lucide-react"

interface NumericCalculatorProps {
  onNumberClick: (number: string) => void
  onBackspace: () => void
  onClear: () => void
  className?: string
}

export default function NumericCalculator({ 
  onNumberClick, 
  onBackspace, 
  onClear, 
  className = "" 
}: NumericCalculatorProps) {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0']
  ]

  return (
    <Card className={`w-full max-w-xs ${className}`}>
      <CardContent className="space-y-3 pt-6">
        {/* Grille des chiffres */}
        <div className="grid grid-cols-3 gap-2">
          {numbers.slice(0, 3).map((row, rowIndex) => 
            row.map((number) => (
              <Button
                key={number}
                variant="outline"
                size="sm"
                onClick={() => onNumberClick(number)}
                className="h-10 text-lg font-semibold hover:bg-blue-50 hover:border-blue-300"
              >
                {number}
              </Button>
            ))
          )}
        </div>
        
        {/* Ligne avec 0 centré */}
        <div className="grid grid-cols-3 gap-2">
          <div></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNumberClick('0')}
            className="h-10 text-lg font-semibold hover:bg-blue-50 hover:border-blue-300"
          >
            0
          </Button>
          <div></div>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackspace}
            className="h-10 text-sm font-medium hover:bg-orange-50 hover:border-orange-300 text-orange-600"
          >
            <Delete className="w-4 h-4 mr-1" />
            Efface
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="h-10 text-sm font-medium hover:bg-red-50 hover:border-red-300 text-red-600"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            CE
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

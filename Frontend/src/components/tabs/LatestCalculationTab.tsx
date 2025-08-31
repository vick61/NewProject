import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Download, Calculator, BarChart3 } from 'lucide-react'
import type { Scheme, Upload, Calculation } from '../types/ViewCalculationsTypes'
import { exportCalculation, exportDistributorArticleSummary, exportDistributorArticleLevel, exportSchemeDistributorLevel } from '../utils/ViewCalculationsExports'

interface Props {
  currentCalculation: Calculation | null
  schemes: Scheme[]
  uploads: Upload[]
}

export default function LatestCalculationTab({ currentCalculation, schemes, uploads }: Props) {
  if (!currentCalculation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calculator className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Current Calculation</h3>
          <p className="text-gray-500">Run a calculation above to see detailed results here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Latest Calculation Details</span>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportCalculation(currentCalculation, schemes, uploads)} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Detailed
            </Button>
            {currentCalculation.distributorArticleSummary && currentCalculation.distributorArticleSummary.length > 0 && (
              <Button onClick={() => exportDistributorArticleSummary(currentCalculation, schemes, uploads)} variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            )}
            <Button onClick={() => exportDistributorArticleLevel([currentCalculation], schemes, uploads)} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Distributor+Article
            </Button>
            <Button onClick={() => exportSchemeDistributorLevel([currentCalculation], schemes, uploads)} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Scheme+Distributor
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ₹{currentCalculation.totalCommission.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Commission</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentCalculation.calculations.length}
                </div>
                <div className="text-sm text-gray-500">Detailed Records</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentCalculation.totalDistributorArticleCombinations || 0}
                </div>
                <div className="text-sm text-gray-500">Distributor-Article Combinations</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Distributor ID</TableHead>
                <TableHead>Article ID</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Net Sales</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Slab Rate</TableHead>
                <TableHead>Group Total Qty</TableHead>
                <TableHead>Group Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCalculation.calculations.slice(0, 50).map((calc, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">{calc.distributorId}</TableCell>
                  <TableCell className="font-mono text-sm">{calc.articleId}</TableCell>
                  <TableCell className="text-right">{calc.billingQuantity}</TableCell>
                  <TableCell className="text-right">₹{calc.netSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">₹{calc.commission.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{calc.slabRate || '-'}</TableCell>
                  <TableCell className="text-right">{calc.totalGroupQuantity || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {calc.totalGroupCommission ? `₹${calc.totalGroupCommission.toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {currentCalculation.calculations.length > 50 && (
          <div className="text-center text-gray-500 text-sm mt-4">
            Showing first 50 records of {currentCalculation.calculations.length}. Export to see all data.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
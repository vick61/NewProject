import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Alert, AlertDescription } from '../ui/alert'
import { Download, BarChart3 } from 'lucide-react'
import { Scheme, Upload, Calculation } from '../types/ViewCalculationsTypes'
import { exportDistributorArticleSummary, exportAllDistributorArticleSummaries, exportDistributorArticleLevel, exportSchemeDistributorLevel } from '../utils/ViewCalculationsExports'

interface Props {
  calculations: Calculation[]
  schemes: Scheme[]
  uploads: Upload[]
}

export default function DistributorArticleSummaryTab({ calculations, schemes, uploads }: Props) {
  const hasDistributorArticleData = calculations.some(calc => calc.distributorArticleSummary && calc.distributorArticleSummary.length > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Distributor-Article Summary View</span>
          </div>
          {hasDistributorArticleData && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => exportAllDistributorArticleSummaries(calculations, schemes, uploads)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All Summaries
              </Button>
              <Button onClick={() => exportDistributorArticleLevel(calculations, schemes, uploads)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Distributor+Article
              </Button>
              <Button onClick={() => exportSchemeDistributorLevel(calculations, schemes, uploads)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Scheme+Distributor
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <BarChart3 className="h-4 w-4" />
          <AlertDescription>
            This view shows commission calculations grouped by distributor-article combinations. Each row represents the total commission for a specific distributor and article combination, calculated using the multi-slab logic where <strong>commission = slab_rate × total_quantity</strong>. 
            <br />
            <strong>Important:</strong> If the total quantity for a distributor-article combination is negative (returns exceed purchases), the commission is automatically set to zero.
          </AlertDescription>
        </Alert>

        {hasDistributorArticleData ? (
          <div className="space-y-6">
            {calculations
              .filter(calc => calc.distributorArticleSummary && calc.distributorArticleSummary.length > 0)
              .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())
              .map(calculation => {
                const scheme = schemes.find(s => s.id === calculation.schemeId)
                const upload = uploads.find(u => u.id === calculation.uploadId)
                
                return (
                  <Card key={calculation.id} className="border-l-4 border-l-purple-500">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg">{scheme?.name || 'Unknown Scheme'}</h4>
                          <p className="text-sm text-gray-500">
                            {upload ? `${upload.month} ${upload.year}` : 'Unknown Period'} • 
                            Calculated: {new Date(calculation.calculatedAt).toLocaleDateString()} • 
                            {calculation.distributorArticleSummary?.length || 0} combinations
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button 
                            onClick={() => exportDistributorArticleSummary(calculation, schemes, uploads)} 
                            variant="outline" 
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Summary
                          </Button>
                          <Button 
                            onClick={() => exportDistributorArticleLevel([calculation], schemes, uploads)} 
                            variant="outline" 
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Dist+Article
                          </Button>
                          <Button 
                            onClick={() => exportSchemeDistributorLevel([calculation], schemes, uploads)} 
                            variant="outline" 
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Scheme+Dist
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Distributor ID</TableHead>
                              <TableHead>Distributor Name</TableHead>
                              <TableHead>Article ID</TableHead>
                              <TableHead>Total Quantity</TableHead>
                              <TableHead>Total Value</TableHead>
                              <TableHead>Slab Rate</TableHead>
                              <TableHead>Commission</TableHead>
                              <TableHead>Sales Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calculation.distributorArticleSummary!.slice(0, 25).map((summary, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-sm">{summary.distributorId}</TableCell>
                                <TableCell>{summary.distributorName}</TableCell>
                                <TableCell className="font-mono text-sm">{summary.articleId}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {summary.totalQuantity}
                                  {summary.totalQuantity < 0 && (
                                    <Badge variant="destructive" className="ml-2 text-xs">Negative Total</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">₹{summary.totalValue.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium">{summary.slabRate}</TableCell>
                                <TableCell className="text-right font-bold">
                                  <span className={summary.totalQuantity < 0 ? "text-gray-500" : "text-green-600"}>
                                    ₹{summary.commission.toFixed(2)}
                                  </span>
                                  {summary.totalQuantity < 0 && (
                                    <div className="text-xs text-gray-500 mt-1">Zero (Negative Qty)</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{summary.salesCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {calculation.distributorArticleSummary!.length > 25 && (
                        <div className="text-center text-gray-500 text-sm mt-4">
                          Showing first 25 combinations of {calculation.distributorArticleSummary!.length}. Export to see all data.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Distributor-Article Summary Data</h3>
            <p className="text-gray-500">
              Run calculations with the new multi-slab logic to see distributor-article summaries here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
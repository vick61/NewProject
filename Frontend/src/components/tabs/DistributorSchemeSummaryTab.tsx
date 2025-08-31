import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { Download, Users, Target } from 'lucide-react'
import { DistributorSchemeSummary } from '../types/ViewCalculationsTypes'

interface DistributorSchemeSummaryTabProps {
  distributorSchemeSummary: DistributorSchemeSummary[]
  onExport: () => void
  isLoading: boolean
}

export default function DistributorSchemeSummaryTab({
  distributorSchemeSummary,
  onExport,
  isLoading
}: DistributorSchemeSummaryTabProps) {
  const totalCommission = distributorSchemeSummary.reduce((sum, summary) => sum + summary.totalCommission, 0)
  const totalArticles = distributorSchemeSummary.reduce((sum, summary) => sum + summary.uniqueArticles.length, 0)
  const uniqueDistributors = distributorSchemeSummary.length

  return (
    <div className="space-y-6">
      {/* Alert explaining this view */}
      <Alert className="mb-4">
        <Target className="h-4 w-4" />
        <AlertDescription>
          This view shows commission totals at the scheme level for each distributor. Each row represents a distributor's total commission across all articles they have sales for, along with the complete list of articles.
          <br />
          <strong>Key Insights:</strong> Quickly identify top-performing distributors and see which articles they're earning commissions on.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Distributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueDistributors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalCommission.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Distributor-Scheme Summary</h3>
        <Button 
          onClick={onExport} 
          disabled={isLoading || distributorSchemeSummary.length === 0}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Summary
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Distributor Commission Summary ({distributorSchemeSummary.length} distributors)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distributorSchemeSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No distributor summary data available. Run a calculation first.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor ID</TableHead>
                    <TableHead>Distributor Name</TableHead>
                    <TableHead className="text-center">Article Count</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Total Commission</TableHead>
                    <TableHead className="text-center">Sales Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributorSchemeSummary
                    .sort((a, b) => b.totalCommission - a.totalCommission) // Sort by commission descending
                    .map((summary, index) => (
                      <TableRow key={`${summary.distributorId}-${index}`}>
                        <TableCell className="font-medium">
                          {summary.distributorId}
                        </TableCell>
                        <TableCell>
                          {summary.distributorName}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {summary.uniqueArticles.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {summary.uniqueArticles.slice(0, 3).map((articleId, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {articleId}
                                </Badge>
                              ))}
                              {summary.uniqueArticles.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{summary.uniqueArticles.length - 3} more
                                </Badge>
                              )}
                            </div>
                            {summary.uniqueArticles.length > 3 && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Show all articles
                                </summary>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {summary.uniqueArticles.slice(3).map((articleId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {articleId}
                                    </Badge>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {summary.totalQuantity}
                          {summary.totalQuantity < 0 && (
                            <Badge variant="destructive" className="ml-2 text-xs">Negative</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{summary.totalValue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={summary.totalQuantity < 0 ? "text-gray-500" : "text-green-600"}>
                            ₹{summary.totalCommission.toFixed(2)}
                          </span>
                          {summary.totalQuantity < 0 && summary.totalCommission === 0 && (
                            <div className="text-xs text-gray-500 mt-1">Zero (Negative Qty)</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {summary.totalSalesCount}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Statistics */}
      {distributorSchemeSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Avg Commission/Distributor</div>
                <div className="font-semibold">₹{(totalCommission / uniqueDistributors).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Articles/Distributor</div>
                <div className="font-semibold">{(totalArticles / uniqueDistributors).toFixed(1)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Top Performer</div>
                <div className="font-semibold">
                  {distributorSchemeSummary.length > 0 
                    ? distributorSchemeSummary.reduce((max, current) => 
                        current.totalCommission > max.totalCommission ? current : max
                      ).distributorName
                    : 'N/A'
                  }
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Most Articles</div>
                <div className="font-semibold">
                  {distributorSchemeSummary.length > 0 
                    ? distributorSchemeSummary.reduce((max, current) => 
                        current.uniqueArticles.length > max.uniqueArticles.length ? current : max
                      ).distributorName
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Eye,
  Trash2,
  Star,
  MapPin,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/supabase-helpers';
import type { Stay, Car, Bike, Experience, ListingType } from '@/types/database';
import { format } from 'date-fns';
import { useDeleteListing } from '@/hooks/useListings';
import { useUpdateMarketplaceRequest, useUpdateMarketplaceVisibility } from '@/hooks/useListings';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface ListingsManagerProps {
  title: string;
  description: string;
  listingType: ListingType | 'hotel' | 'resort';
  listings: (Stay | Car | Bike | Experience)[];
  isLoading: boolean;
  priceKey: 'price_per_night' | 'price_per_day' | 'price_per_person';
  priceLabel: string;
  emptyIcon: React.ReactNode;
  isAdminUser?: boolean;
}

export function ListingsManager({
  title,
  description,
  listingType,
  listings,
  isLoading,
  priceKey,
  priceLabel,
  emptyIcon,
  isAdminUser = false,
}: ListingsManagerProps) {
    const [isWarningOpen, setIsWarningOpen] = useState(false);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('table');
  const deleteListing = useDeleteListing();
  const updateMarketplaceRequest = useUpdateMarketplaceRequest();
  const updateMarketplaceVisibility = useUpdateMarketplaceVisibility();

  const filteredListings = listings.filter((listing) =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (((listing as any).host_name as string | undefined)?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getPrice = (listing: Stay | Car | Bike | Experience) => {
    if (priceKey === 'price_per_night') return (listing as Stay).price_per_night;
    if (priceKey === 'price_per_day') return (listing as Car | Bike).price_per_day;
    return (listing as Experience).price_per_person;
  };

  const getPublicPath = (listing: Stay | Car | Bike | Experience) => {
    const prefixMap: Record<ListingType | 'hotel' | 'resort', string> = {
      stay: '/stays',
      car: '/cars',
      bike: '/bikes',
      experience: '/experiences',
      hotel: '/hotels',
      resort: '/resorts',
    };
    return `${prefixMap[listingType]}/${listing.id}`;
  };

  const handleDelete = async (listingId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this listing? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteListing.mutateAsync({ listingType, listingId });
      toast.success('Listing deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete listing.');
    }
  };

  const handleMarketplaceToggle = async (listingId: string, nextValue: boolean) => {
    // Check if listing is currently live and user is a host trying to toggle it off
    const currentListing = listings.find(l => l.id === listingId);
    if (currentListing && !isAdminUser && !nextValue && (currentListing as any).marketplace_visible) {
      setIsWarningOpen(true);
      return;
    }

    try {
      if (isAdminUser) {
        await updateMarketplaceVisibility.mutateAsync({
          listingType,
          listingId,
          marketplaceVisible: nextValue,
        });
        toast.success(nextValue ? 'Listing approved for marketplace.' : 'Listing removed from marketplace.');
        return;
      }

      await updateMarketplaceRequest.mutateAsync({
        listingType,
        listingId,
        marketplaceRequested: nextValue,
      });
      toast.success(nextValue ? 'Marketplace request sent for admin approval.' : 'Marketplace request withdrawn.');
    } catch {
      toast.error('Failed to update marketplace status.');
    }
  };

  const editPathBase = `/host/${listingType === 'experience' ? 'experiences' : listingType + 's'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <Button className="w-full lg:w-auto" onClick={() => navigate(`/host/${listingType === 'experience' ? 'experiences' : listingType + 's'}?mode=add`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('grid')}
              >
                Grid
              </Button>
              <Button
                variant={view === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('table')}
              >
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-secondary rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 mb-4 text-muted-foreground/50">
              {emptyIcon}
            </div>
            <h3 className="text-lg font-semibold mb-2">No {title.toLowerCase()} yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first {listingType} listing
            </p>
            <Button onClick={() => navigate(`/host/${listingType === 'experience' ? 'experiences' : listingType + 's'}?mode=add`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
            </Button>
          </div>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden hover-lift group">
              <div className="relative h-48 bg-secondary">
                {listing.images && listing.images[0] ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  {listing.is_verified && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {listing.featured && (
                    <Badge variant="secondary">Featured</Badge>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant={listing.availability_status ? 'default' : 'secondary'}>
                    {listing.availability_status ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{listing.title}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="truncate">{listing.location}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`${editPathBase}?mode=edit&id=${listing.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(getPublicPath(listing))}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(getPublicPath(listing), '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(listing.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-lg font-bold text-primary-text">
                      {formatPrice(getPrice(listing))}
                    </p>
                    <p className="text-xs text-muted-foreground">{priceLabel}</p>
                  </div>
                  <div className="text-right">
                    {listing.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{listing.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {listing.views_count || 0} views
                    </p>
                    {!!(listing as any).host_name && isAdminUser && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Host: {(listing as any).host_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <span className="text-[11px] text-muted-foreground">
                        {isAdminUser ? 'Marketplace Live' : 'Request Marketplace'}
                      </span>
                      <Switch
                        checked={isAdminUser ? ((listing as any).marketplace_visible ?? false) : ((listing as any).marketplace_requested ?? false)}
                        onCheckedChange={(value) => handleMarketplaceToggle(listing.id, value)}
                      />
                    </div>
                    {isAdminUser && (
                      <p className="text-[11px] text-muted-foreground mt-1 text-right">
                        Request: {(listing as any).marketplace_requested ? 'Pending/Requested' : 'Not requested'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marketplace Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Rating</TableHead>
                {isAdminUser && <TableHead>Host</TableHead>}
                <TableHead>{isAdminUser ? 'Marketplace Live' : 'Marketplace Request'}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                        {listing.images?.[0] && (
                          <img
                            src={listing.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{listing.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(listing.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                      {listing.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{formatPrice(getPrice(listing))}</p>
                    <p className="text-xs text-muted-foreground">{priceLabel}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={listing.availability_status ? 'default' : 'secondary'}>
                      {listing.availability_status ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {((listing as any).marketplace_visible ?? false) ? (
                      <Badge className="bg-green-500 text-white hover:bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    ) : ((listing as any).marketplace_requested ?? false) ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not Requested
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{listing.views_count || 0}</TableCell>
                  <TableCell>
                    {listing.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {listing.rating.toFixed(1)}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  {isAdminUser && (
                    <TableCell>{(listing as any).host_name || 'Unknown host'}</TableCell>
                  )}
                  <TableCell>
                    <Switch
                      checked={isAdminUser ? ((listing as any).marketplace_visible ?? false) : ((listing as any).marketplace_requested ?? false)}
                      onCheckedChange={(value) => handleMarketplaceToggle(listing.id, value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`${editPathBase}?mode=edit&id=${listing.id}`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(getPublicPath(listing))}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(listing.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Warning Modal */}
      <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <AlertDialogContent className="max-w-[400px] p-6">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold tracking-tight">
                Remove from Marketplace?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-muted-foreground pt-2 space-y-4">
              <p>
                Please contact customer care or admin to remove the listing from the marketplace.
              </p>
              <p className="text-sm font-medium text-amber-800 bg-amber-50/50 p-3 rounded-md border border-amber-100 italic">
                Note: Once removed, you cannot request for listing in the marketplace again.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex !flex-col-reverse sm:!flex-row gap-2">
            <AlertDialogAction 
              onClick={() => setIsWarningOpen(false)}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

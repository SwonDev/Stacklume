"use client";

import { useState, useCallback, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface SubscriptionManagerWidgetProps {
  widget: Widget;
}

interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextRenewal: string; // ISO date string
  color: string;
  category?: string;
}

const SUBSCRIPTION_COLORS = [
  { name: "Rojo", value: "rgb(239, 68, 68)", class: "bg-red-500" },
  { name: "Naranja", value: "rgb(249, 115, 22)", class: "bg-orange-500" },
  { name: "Verde", value: "rgb(34, 197, 94)", class: "bg-green-500" },
  { name: "Azul", value: "rgb(59, 130, 246)", class: "bg-blue-500" },
  { name: "Morado", value: "rgb(168, 85, 247)", class: "bg-purple-500" },
  { name: "Rosa", value: "rgb(236, 72, 153)", class: "bg-pink-500" },
  { name: "Cian", value: "rgb(6, 182, 212)", class: "bg-cyan-500" },
  { name: "Gris", value: "rgb(107, 114, 128)", class: "bg-gray-500" },
];

const SUBSCRIPTION_CATEGORIES = [
  "Streaming",
  "Musica",
  "Software",
  "Gaming",
  "Almacenamiento",
  "Productividad",
  "Fitness",
  "Noticias",
  "Educacion",
  "Otro",
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDaysUntil = (dateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getRenewalStatus = (
  daysUntil: number
): { label: string; color: string } => {
  if (daysUntil < 0) {
    return { label: "Vencido", color: "text-red-500" };
  }
  if (daysUntil === 0) {
    return { label: "Hoy", color: "text-amber-500" };
  }
  if (daysUntil <= 3) {
    return { label: `En ${daysUntil} dias`, color: "text-amber-500" };
  }
  if (daysUntil <= 7) {
    return { label: `En ${daysUntil} dias`, color: "text-blue-500" };
  }
  return { label: formatDate(new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000).toISOString()), color: "text-muted-foreground" };
};

export function SubscriptionManagerWidget({
  widget,
}: SubscriptionManagerWidgetProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formBillingCycle, setFormBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [formNextRenewal, setFormNextRenewal] = useState("");
  const [formColor, setFormColor] = useState(SUBSCRIPTION_COLORS[0].value);
  const [formCategory, setFormCategory] = useState("");

  const subscriptions: Subscription[] = widget.config?.subscriptions || [];

  const saveSubscriptions = useCallback(
    (items: Subscription[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          subscriptions: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const resetForm = () => {
    setFormName("");
    setFormCost("");
    setFormBillingCycle("monthly");
    setFormNextRenewal("");
    setFormColor(SUBSCRIPTION_COLORS[0].value);
    setFormCategory("");
  };

  const handleOpenAddDialog = () => {
    resetForm();
    // Set default next renewal to today
    const today = new Date();
    setFormNextRenewal(today.toISOString().split("T")[0]);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormName(subscription.name);
    setFormCost(subscription.cost.toString());
    setFormBillingCycle(subscription.billingCycle);
    setFormNextRenewal(subscription.nextRenewal.split("T")[0]);
    setFormColor(subscription.color);
    setFormCategory(subscription.category || "");
    setIsEditDialogOpen(true);
  };

  const handleAddSubscription = () => {
    const costValue = parseFloat(formCost);

    if (!formName.trim() || isNaN(costValue) || costValue <= 0 || !formNextRenewal)
      return;

    const newSubscription: Subscription = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      cost: costValue,
      billingCycle: formBillingCycle,
      nextRenewal: new Date(formNextRenewal).toISOString(),
      color: formColor,
      category: formCategory || undefined,
    };

    saveSubscriptions([...subscriptions, newSubscription]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateSubscription = () => {
    if (!editingSubscription) return;

    const costValue = parseFloat(formCost);

    if (!formName.trim() || isNaN(costValue) || costValue <= 0 || !formNextRenewal)
      return;

    const updatedSubscriptions = subscriptions.map((s) =>
      s.id === editingSubscription.id
        ? {
            ...s,
            name: formName.trim(),
            cost: costValue,
            billingCycle: formBillingCycle,
            nextRenewal: new Date(formNextRenewal).toISOString(),
            color: formColor,
            category: formCategory || undefined,
          }
        : s
    );

    saveSubscriptions(updatedSubscriptions);
    setIsEditDialogOpen(false);
    setEditingSubscription(null);
    resetForm();
  };

  const handleDeleteSubscription = (id: string) => {
    saveSubscriptions(subscriptions.filter((s) => s.id !== id));
  };

  // Sort subscriptions by next renewal date
  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort(
      (a, b) =>
        new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime()
    );
  }, [subscriptions]);

  // Calculate totals
  const monthlyCost = useMemo(() => {
    return subscriptions.reduce((sum, s) => {
      if (s.billingCycle === "monthly") {
        return sum + s.cost;
      }
      return sum + s.cost / 12;
    }, 0);
  }, [subscriptions]);

  const yearlyCost = useMemo(() => {
    return subscriptions.reduce((sum, s) => {
      if (s.billingCycle === "yearly") {
        return sum + s.cost;
      }
      return sum + s.cost * 12;
    }, 0);
  }, [subscriptions]);

  // Upcoming renewals (next 7 days)
  const upcomingRenewals = useMemo(() => {
    return sortedSubscriptions.filter((s) => {
      const daysUntil = getDaysUntil(s.nextRenewal);
      return daysUntil >= 0 && daysUntil <= 7;
    });
  }, [sortedSubscriptions]);

  const isFormValid = (): boolean => {
    if (!formName.trim()) return false;
    const costValue = parseFloat(formCost);
    if (isNaN(costValue) || costValue <= 0) return false;
    if (!formNextRenewal) return false;
    return true;
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Empty state */}
        {subscriptions.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center @md:w-14 @md:h-14"
            >
              <CreditCard className="w-6 h-6 text-primary @md:w-7 @md:h-7" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1 @md:text-base">
                Sin suscripciones
              </p>
              <p className="text-xs text-muted-foreground @md:text-sm">
                Añade tus suscripciones para llevar un control de gastos
              </p>
            </div>
            <Button
              onClick={handleOpenAddDialog}
              size="sm"
              className="gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Añadir suscripcion
            </Button>
          </div>
        )}

        {/* Subscriptions list */}
        {subscriptions.length > 0 && (
          <>
            {/* Summary header */}
            <div className="p-3 border-b @sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Suscripciones</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {subscriptions.length} activa
                  {subscriptions.length !== 1 && "s"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-lg p-2 @sm:p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider @sm:text-xs">
                    Mensual
                  </p>
                  <p className="text-base font-bold text-foreground @sm:text-lg">
                    {formatCurrency(monthlyCost)}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2 @sm:p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider @sm:text-xs">
                    Anual
                  </p>
                  <p className="text-base font-bold text-foreground @sm:text-lg">
                    {formatCurrency(yearlyCost)}
                  </p>
                </div>
              </div>

              {/* Upcoming renewals alert */}
              {upcomingRenewals.length > 0 && (
                <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {upcomingRenewals.length} renovacion
                      {upcomingRenewals.length !== 1 && "es"} proxima
                      {upcomingRenewals.length !== 1 && "s"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2 @sm:p-4 @sm:space-y-3">
                <AnimatePresence mode="popLayout">
                  {sortedSubscriptions.map((subscription, index) => {
                    const daysUntil = getDaysUntil(subscription.nextRenewal);
                    const status = getRenewalStatus(daysUntil);
                    const isUpcoming = daysUntil >= 0 && daysUntil <= 7;

                    return (
                      <motion.div
                        key={subscription.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "group relative rounded-lg border bg-card p-3 transition-all hover:shadow-md @sm:p-4",
                          isUpcoming && "border-amber-500/50 bg-amber-500/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Color indicator */}
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: subscription.color }}
                          >
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-medium text-foreground truncate @sm:text-base">
                                  {subscription.name}
                                </h3>
                                {subscription.category && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] mt-1"
                                  >
                                    {subscription.category}
                                  </Badge>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenEditDialog(subscription)
                                  }
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteSubscription(subscription.id)
                                  }
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {formatCurrency(subscription.cost)}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  <RotateCcw className="w-2.5 h-2.5 mr-1" />
                                  {subscription.billingCycle === "monthly"
                                    ? "Mensual"
                                    : "Anual"}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 mt-2 text-xs">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className={status.color}>
                                {daysUntil < 0
                                  ? "Vencido"
                                  : daysUntil === 0
                                  ? "Hoy"
                                  : `En ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`}
                              </span>
                              <span className="text-muted-foreground">
                                ({formatDate(subscription.nextRenewal)})
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Add button footer */}
            <div className="border-t p-3 @sm:p-4">
              <Button
                onClick={handleOpenAddDialog}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir suscripcion
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Add Subscription Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva suscripcion</DialogTitle>
            <DialogDescription>
              Añade una suscripcion para llevar el control
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-name">Nombre</Label>
              <Input
                id="sub-name"
                placeholder="ej: Netflix, Spotify, Adobe CC"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sub-cost">Precio</Label>
                <Input
                  id="sub-cost"
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-cycle">Ciclo de pago</Label>
                <Select
                  value={formBillingCycle}
                  onValueChange={(v) =>
                    setFormBillingCycle(v as "monthly" | "yearly")
                  }
                >
                  <SelectTrigger id="sub-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-renewal">Proxima renovacion</Label>
              <Input
                id="sub-renewal"
                type="date"
                value={formNextRenewal}
                onChange={(e) => setFormNextRenewal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-category">Categoria (opcional)</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="sub-category">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SUBSCRIPTION_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.class,
                      formColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-110"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSubscription} disabled={!isFormValid()}>
              Añadir suscripcion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar suscripcion</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la suscripcion
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sub-name">Nombre</Label>
              <Input
                id="edit-sub-name"
                placeholder="ej: Netflix, Spotify, Adobe CC"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sub-cost">Precio</Label>
                <Input
                  id="edit-sub-cost"
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sub-cycle">Ciclo de pago</Label>
                <Select
                  value={formBillingCycle}
                  onValueChange={(v) =>
                    setFormBillingCycle(v as "monthly" | "yearly")
                  }
                >
                  <SelectTrigger id="edit-sub-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sub-renewal">Proxima renovacion</Label>
              <Input
                id="edit-sub-renewal"
                type="date"
                value={formNextRenewal}
                onChange={(e) => setFormNextRenewal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sub-category">Categoria (opcional)</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="edit-sub-category">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SUBSCRIPTION_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.class,
                      formColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-110"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingSubscription(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateSubscription} disabled={!isFormValid()}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteAssessment } from "@/app/(app)/modules/[id]/assessments/actions";
import { deleteComment } from "@/app/(app)/assessments/comments/actions";
import { deleteGrid } from "@/app/(app)/assessments/grids/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function ConfirmDeleteButton({
  label,
  description,
  onConfirm,
  size,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
  size?: "sm" | "default" | "icon";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size={size} disabled={pending}>
          <Trash2 aria-hidden />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label} ?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(onConfirm)}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteGridButton({ id }: { id: string }) {
  return (
    <ConfirmDeleteButton
      label="Supprimer la grille"
      description="Les évaluations qui l'utilisent garderont leurs notes, mais perdront le détail par critère."
      onConfirm={() => void deleteGrid(id)}
      size="sm"
    />
  );
}

export function DeleteCommentButton({ id }: { id: string }) {
  return (
    <ConfirmDeleteButton
      label="Supprimer"
      description="Action définitive."
      onConfirm={() => void deleteComment(id)}
      size="sm"
    />
  );
}

export function DeleteAssessmentButton({
  moduleId,
  assessmentId,
}: {
  moduleId: string;
  assessmentId: string;
}) {
  return (
    <ConfirmDeleteButton
      label="Supprimer l’évaluation"
      description="Action définitive. Les notes saisies seront perdues."
      onConfirm={() => void deleteAssessment(moduleId, assessmentId)}
    />
  );
}

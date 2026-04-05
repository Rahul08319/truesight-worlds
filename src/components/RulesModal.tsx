import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RulesModalProps {
  trigger: React.ReactNode;
}

const RulesModal: React.FC<RulesModalProps> = ({ trigger }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl gold-accent">Game Rules</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm text-foreground/90">
          <section>
            <h3 className="font-heading font-semibold text-base text-primary mb-2">🎯 Objective</h3>
            <p>Be the first player to move all 4 of your tokens from home to the goal cell at the center of the board.</p>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-primary mb-2">🎲 Rolling the Dice</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>On your turn, roll the dice to determine how many cells to advance.</li>
              <li>Roll a <strong>5</strong> to move a token out of home onto the starting cell.</li>
              <li>Roll a <strong>6</strong> to earn an extra turn.</li>
              <li>Three consecutive 6s — your last moved token goes back home!</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-primary mb-2">⚔️ Killing</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Land on a cell occupied by another player's single token to send it home.</li>
              <li>Killing earns a <strong>20-cell bonus</strong> advance for one of your other tokens.</li>
              <li>You <strong>cannot</strong> kill on safe cells (marked with a star/ring).</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-primary mb-2">🧱 Walls</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Two tokens of the same color on one cell form a <strong>wall</strong>.</li>
              <li>No token can pass through a wall.</li>
              <li>If you roll a 6 and have a wall, you must break it.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-primary mb-2">🏠 Reaching the Goal</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must roll the <strong>exact number</strong> needed to reach the goal.</li>
              <li>Reaching the goal earns a <strong>10-cell bonus</strong> advance.</li>
              <li>First player to get all 4 tokens to the goal wins! 🏆</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-primary mb-2">🎮 Controls</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click the dice to roll.</li>
              <li>Click a glowing token to select which one to move.</li>
              <li>CPU players move automatically.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RulesModal;

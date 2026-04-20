# NFA to DFA Simulator 🚀

**Making Theory of Computation look (and feel) incredible.**

Automata Theory can be a bit abstract, so I built this interactive playground to make the **Subset Construction Algorithm** easier to visualize. Whether you're a student trying to wrap your head around $\epsilon$-closures or just curious about how non-deterministic machines turn into deterministic ones, this tool is for you.

![Tech Stack](https://skillicons.dev/icons?i=html,css,js)

## ✨ Why You'll Love This

-   **Algorithmic Transparency**: It doesn't just give you the answer—it shows the work. You can see exactly how NFA subsets map to new DFA states.
-   **Live State Diagrams**: We use the HTML5 Canvas to draw beautiful, interactive diagrams. You can switch between your original NFA and the newly minted DFA in a click.
-   **Real-time Tables**: If you prefer looking at data, our side-by-side transition tables update as you work.
-   **Designed for Focus**: 
    -   **Obsidian & Cyber-Cyan**: A sleek, dark theme that's easy on the eyes.
    -   **Glassmorphism**: Modern, frosted-glass UI elements for a premium feel.
    -   **Light Mode**: For those who prefer a brighter workspace.
-   **Smart Validation**: It catches typos and invalid transitions as you type, so you don't have to guess what went wrong.
-   **One-Click Examples**: Not sure where to start? Load a preset like "Strings ending in 'ab'" to see it in action instantly.

## 🛠️ What's Under the Hood?

I kept things lean and fast by staying close to the metal:
-   **JS (ES6+)**: Handles all the heavy lifting of the subset construction logic.
-   **Canvas API**: Powers the custom-built state diagram engine. No heavy external libraries—just clean, custom code.
-   **Modern CSS**: Uses variables and flexbox/grid for a responsive experience that looks great on any screen.

## 🚀 Jump Right In

### 1. Define your NFA
Pop in your states (`q0, q1...`), your alphabet, and your start/accept states.
### 2. Add Transitions
Use the simple format: `state, symbol, next1;next2`. 
-   Want an epsilon transition? Just type `epsilon`.
-   Need a dead state? Use `empty` or leave it blank.
### 3. Hit Convert
Click **"Convert to DFA"** and watch the algorithm do its magic.
### 4. Explore the Results
Dig into the **State Mapping** to see how your NFA states merged, or toggle between diagrams to see the machines side-by-side.

## 📐 Algorithm Detail

The simulator implements the core phases of automata conversion:
1.  **$\epsilon$-Closure**: Finds all states reachable from a set of states using only epsilon transitions.
2.  **Move Function**: Computes the set of states reachable from a given set on a specific input symbol.
3.  **Subset Construction**: Iteratively builds the DFA state space where each DFA state represents a unique subset of NFA states.

## 🎨 Design Philosophy

This project prioritizes **Visual Excellence** and **User Engagement**.
-   **Micro-animations**: Subtle hover effects and loading states.
-   **Premium Palette**: Deep obsidian backgrounds contrasted with vibrant cyan and orange accents.
-   **Clarity**: Clear distinction between Start, Accept, and Dead states via specific visual markers (labels, double-rings, color-coding).

---


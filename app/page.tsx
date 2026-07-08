"use client";
import { TicTacToe } from "@/app/components/tic-tac-toe";
import { Container } from "@/app/components/gameStyles";

export default function Home() {
    return (
        <main>
            <Container>
                <TicTacToe />
            </Container>
        </main>
    );
}


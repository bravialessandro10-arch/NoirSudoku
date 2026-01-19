// Sudoku 44 Circuit
// Verifica che una soluzione sia valida per un dato problema

fn main(
    // Problema Sudoku (pubblico) - 0 = cella vuota
    problema: pub [[u32; 4]; 4],
    
    // Soluzione (privata)
    soluzione: [[u32; 4]; 4]
) {
    // 1. Verifica valori ammissibili (1-4)
    for i in 0..4 {
        for j in 0..4 {
            assert(soluzione[i][j] >= 1);
            assert(soluzione[i][j] <= 4);
        }
    }
    
    // Verifica unicita righe
    for i in 0..4 {
        verifica_unicita(soluzione[i]);
    }
    
    // Verifica unicita colonne
    for j in 0..4 {
        let mut colonna = [0 as u32; 4];
        for i in 0..4 {
            colonna[i] = soluzione[i][j];
        }
        verifica_unicita(colonna);
    }
    
    for blocco_riga in 0..2 {
        for blocco_col in 0..2 {
            let mut blocco = [0 as u32; 4];
            let mut indice = 0;
            
            for i in 0..2 {
                for j in 0..2 {
                    let riga = blocco_riga * 2 + i;
                    let col = blocco_col * 2 + j;
                    blocco[indice] = soluzione[riga][col];
                    indice += 1;
                }
            }
            
            verifica_unicita(blocco);
        }
    }
    
    // Verifica coerenza con problema iniziale
    for i in 0..4 {
        for j in 0..4 {
            // Se problema[i][j] != 0, deve matchare soluzione
            if problema[i][j] != 0 {
                assert(soluzione[i][j] == problema[i][j]);
            }
        }
    }
    
    
}

// Funzione helper: verifica che array contenga [1,2,3,4] esattamente una volta
fn verifica_unicita(arr: [u32; 4]) {
    let mut occorrenze = [0 as u32; 4];
    
    // Conta occorrenze di ogni numero
    for i in 0..4 {
        let valore = arr[i];
        let indice = valore - 1; 
        occorrenze[indice] += 1;
    }
    
    // Ogni numero deve apparire esattamente 1 volta
    for i in 0..4 {
        assert(occorrenze[i] == 1);
    }
}
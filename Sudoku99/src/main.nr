// Sudoku 99 Circuit
// Verifica che una soluzione sia valida per un dato problema

fn main(
    // Problema Sudoku (pubblico) - 0 = cella vuota
    problema: pub [[u32; 9]; 9],
    
    // Soluzione (privata)
    soluzione: [[u32; 9]; 9]
) {
    // 1. Verifica valori ammissibili (1-9)
    for i in 0..9 {
        for j in 0..9 {
            assert(soluzione[i][j] >= 1);
            assert(soluzione[i][j] <= 9);
        }
    }
    
    // 2. Verifica unicita righe
    for i in 0..9 {
        verifica_unicita(soluzione[i]);
    }
    
    // 3. Verifica unicita colonne
    for j in 0..9 {
        let mut colonna = [0 as u32; 9];
        for i in 0..9 {
            colonna[i] = soluzione[i][j];
        }
        verifica_unicita(colonna);
    }
    
    // 4. Verifica unicita blocchi 3x3
    for blocco_riga in 0..3 {
        for blocco_col in 0..3 {
            let mut blocco = [0 as u32; 9];
            let mut indice = 0;
            
            for i in 0..3 {
                for j in 0..3 {
                    let riga = blocco_riga * 3 + i;
                    let col = blocco_col * 3 + j;
                    blocco[indice] = soluzione[riga][col];
                    indice += 1;
                }
            }
            
            verifica_unicita(blocco);
        }
    }
    
    // 5. Verifica coerenza con problema iniziale
    for i in 0..9 {
        for j in 0..9 {
            // Se problema[i][j] != 0, deve matchare soluzione
            if problema[i][j] != 0 {
                assert(soluzione[i][j] == problema[i][j]);
            }
        }
    }
    
    
}

// Funzione helper: verifica che array contenga [1,2,3,4,5,6,7,8,9] esattamente una volta
fn verifica_unicita(arr: [u32; 9]) {
    let mut occorrenze = [0 as u32; 9];
    
    // Conta occorrenze di ogni numero
    for i in 0..9 {
        let valore = arr[i];
        let indice = valore - 1;
        occorrenze[indice] += 1;
    }
    
    // Ogni numero deve apparire esattamente 1 volta
    for i in 0..9 {
        assert(occorrenze[i] == 1);
    }
}
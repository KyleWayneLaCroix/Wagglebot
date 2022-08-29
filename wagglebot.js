// ==UserScript==
// @name         Wagglebot - NYT Spelling Bee Helper
// @namespace    http://tampermonkey.net/
// @version      1
// @description  A fun little tool to help you with the NYT Spelling Bee that brings in the hints to the same page.
// @author       Kyle LaCroix
// @match        https://www.nytimes.com/puzzles/spelling-bee
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nytimes.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const stylesheet = `
.waggle-show .sb-content-box {
  max-width: 800px;
}
.waggle-show #spelling-bee-container .pz-game-screen {
  max-width: 800px;
  display:block;
  margin:0 auto;
}
#waggle-bot {
  display:none;
}
.waggle-show #waggle-bot {
  grid-row: 2;
  display:initial;
}
.waggle-show#js-hook-game-wrapper {
  display: grid;
  grid-template-columns: 3fr 1fr;
  grid-template-rows: auto;
  max-width: 1200px;
  margin: 0 auto;
}
.waggle-show #portal-game-moments {
  grid-row: 1;
}
.waggle-show #js-hook-pz-moment__game {
  grid-row: 2;
}
.waggle-show #portal-editorial-content {
  grid-row: 3;
}

#waggle-grid {
  width: 100%;
  text-align: center;
  text-transform: uppercase;
}
#waggle-grid tr {
  height: 30px;
}
#waggle-grid th,#waggle-grid td {
  width: 30px;
  min-width: 30px;
  max-width: 40px;
}
#waggle-grid th {
  font-weight: bold;
}
#waggle-grid, #waggle-two-wrapper {
  font-family: nyt-imperial;
  font-size: 1.125rem;
  line-height: 1.5625rem;
}
#waggle-two-wrapper span {
  margin: 0 2px;
}
#waggle-bot .all-found {
  background: #7bd77b;
}
#waggle-bot .none-found {
  background: #959595;
}
#waggle-bot .some-found {
  background: #fbfb90;
}
#waggle-bot .no-words {
  background: #1a1818;
}
#waggle-grid tr:last-child th:last-child {
  font-style: italic;
}
#waggle-list {
  width: auto;
  text-align: center;
  text-transform: uppercase;
}
#waggle-list td {
  width: 45px;
}
#waggle-greetings h2 {
  font-size: 1.5rem;
  text-align: center;
  font-weight: bold;
  margin-bottom: 11px;
}
#waggle-greetings p {
  margin-bottom: 12px;
}
#waggle-facts-wrapper {
  margin-bottom: 15px;
  font-size: 1.1rem;
}
#waggle-two-wrapper h3 {
  font-weight: bold;
  font-size: 1.2rem;
}
    `
    /* Text Variables */
    const greetingText = "Welcome to Wagglebot! Your NYT Spelling Bee helper. Get Today's Hints on the same screen!";
    const headerText = "Wagglebot";

    /* Spelling Bee Data */
    const todayGame = window.gameData.today;

    class Wagglebot {
        constructor(gameData){
            /* HTML identifiers */
            this.foundContainer = document.getElementsByClassName('sb-wordlist-items-pag')[0];
            this.foundElements = document.getElementsByClassName('sb-wordlist-items-pag')[0].getElementsByClassName('sb-anagram');
            this.currentRankElement = document.getElementsByClassName('sb-progress-rank')[0];
            this.currentScoreElement = document.getElementsByClassName('sb-progress-value')[0];
            /* Game Data */
            const todayGame = gameData.today;
            this.answerCount = todayGame.answers.length;
            this.pangramCount = todayGame.pangrams.length;
            this.answers = todayGame.answers;
            this.pangrams = todayGame.pangrams;
            this.validLetters = todayGame.validLetters;
            this.centerLetter = todayGame.centerLetter;
            this.outerLetters = todayGame.outerLetters;
            this.minAnswerLength = Math.min(...this.answers.map(o => o.length));
            this.maxAnswerLength = Math.max(...this.answers.map(o => o.length));
            /* Calculated Game Data */
            this.#findPerfectPangrams();
            this.#findMaxPoints();
            this.#findBingo();
            /* User Variables */
            this.foundBingo = false;
            this.gn4l = false;
            this.gn4lotn = false;
            this.gnp = false;
            this.currentScore = 0;
            this.currenRank = "Beginner";
            this.foundAnswers = [];
            this.foundPangrams = [];
            /* Current Game HTML Data */
            this.findFoundAnswers();
            this.findCurrentScore();
            this.findCurrentRank();
            this.updateFactList();
            /* Observers */
            this.observerFindAnswer();
        }
        /* Observers */
        observerFindAnswer(){
            const config = { attributes: true, childList: true, subtree: true };
            const targetNode = this.foundContainer;
            const callback = (mutationList, observer) => {
                for (const mutation of mutationList) {
                    if(mutation.type === 'childList'){
                        this.findFoundAnswers();
                        this.findCurrentRank();
                        this.findCurrentScore();
                        this.updateGrid();
                        this.updateTwoLetterList();
                        this.updateFactList();
                    }
                }
            };
            const observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
        }
        /* Construct Game Data*/
        #findPerfectPangrams(){
            if(this.pangramCount > 0){
                this.perfectPangramCount = this.pangrams.filter((word) => word.length == 7).length;
                this.perfectPangrams = this.pangrams.filter((word) => word.length == 7);
            } else {
                this.perfectPangramCount = 0;
                this.perfectPangrams = [];
            }
        }
        #findMaxPoints(){
            this.maxPoints = 0;
            this.answers.forEach((word) => {
                if(word.length == 4){
                    this.maxPoints += 1;
                } else {
                    this.maxPoints += word.length;
                }
            });
            /* 7 bonus points for each pangram */
            this.maxPoints += (this.pangramCount * 7);
        }
        #findBingo(){
            if([...new Set(this.answers.map(o => o.substring(0,1)))].length == 7){
                this.bingo = true;
            } else {
                this.bingo = false;
            }
        }
        findFoundAnswers(){
            this.foundAnswers = new Array;
            this.foundPangrams = new Array;
            Array.from(this.foundElements).forEach((word) => {
              this.foundAnswers.push(word.textContent);
              if(this.pangrams.includes(word.textContent)){this.foundPangrams.push(word.textContent);}
            });
        }
        findCurrentRank(){
            this.currentRank = this.currentRankElement.textContent;
        }
        findCurrentScore(){
            this.currentScore = this.currentScoreElement.textContent;
        }
        buildGridObject(){
            let gridData = {};
            let lengths = [...new Set(this.answers.map(o => o.length))];
            lengths.sort(function(a,b){return a-b});
            /* Get Answer Data */
            this.validLetters.forEach((letter) => {
                let words = this.answers.filter((word) => word.startsWith(letter));
                gridData[letter.toUpperCase()] = {};
                lengths.forEach((wordLen) => {
                    let wlist = words.filter((word) => word.length == wordLen);
                    gridData[letter.toUpperCase()][wordLen] = [];
                    if(wlist.length > 0){
                        wlist.forEach((word) => {
                            // True if it has been guessed.
                            if(this.foundAnswers.includes(word)){
                                gridData[letter.toUpperCase()][wordLen].push({[word]:true});
                            } else {
                                gridData[letter.toUpperCase()][wordLen].push({[word]:false});
                            }
                        });
                    }
                });
            });
            this.gridObject = gridData;
        }
        buildTwoLetterList(){
            let twoLetterList = {};
            let answerStarts = [...new Set(this.answers.map(o => o.substring(0,1)))];
            answerStarts.forEach((letter) => { twoLetterList[letter] = {} });
            let twoLetters = [...new Set(this.answers.map(o => o.substring(0,2)))];
            twoLetters.forEach((twoLett) => {
                let twoList = this.answers.filter((word) => word.startsWith(twoLett));
                twoLetterList[twoLett.substring(0,1)][twoLett] = [];
                twoList.forEach((word) => {
                    if(this.foundAnswers.includes(word)){
                        twoLetterList[twoLett.substring(0,1)][twoLett].push({[word]:true});
                    } else {
                        twoLetterList[twoLett.substring(0,1)][twoLett].push({[word]:false});
                    }
                });
            });
            this.twoLetterObject = twoLetterList;
        }
        updateGrid(){
            /* The Grid */
            this.buildGridObject();
            const gridElement = document.getElementById('waggle-grid');
            const gridHeader = document.createElement('tr');
            gridElement.textContent = '';
            let headerRow = [' '];
            let numbers = [...new Set(this.answers.map(o => o.length))];
            numbers.sort(function(a,b){return a-b});
            numbers.forEach((i)=>{headerRow.push(i);});
            headerRow.push('Σ');
            headerRow.forEach((header) => {
                const cell = document.createElement('th');
                cell.setAttribute('data-gridHeader',header);
                cell.appendChild(document.createTextNode(header.toString()));
                gridHeader.appendChild(cell);
            });
            gridElement.appendChild(gridHeader);
            let answerStarts = [...new Set(this.answers.map(o => o.substring(0,1).toUpperCase()))];
            answerStarts.sort();
            answerStarts.forEach((letter) => {
                const gridRow = document.createElement('tr');
                gridRow.setAttribute('data-gridRow', letter);
                let rowData = this.gridObject[letter];
                const rowHeader = document.createElement('th');
                rowHeader.appendChild(document.createTextNode(letter));
                gridRow.appendChild(rowHeader);
                let count = 0;
                let totalFound = 0;
                numbers.forEach((number) => {
                    let wList = this.gridObject[letter][number];
                    const cell = document.createElement('td');
                    cell.setAttribute('data-gridCell',letter + number.toString());
                    if(wList.length > 0){
                        cell.appendChild(document.createTextNode(wList.length.toString()));
                        let found = 0;
                        wList.forEach((word) => {
                            if(this.foundAnswers.includes(Object.keys(word)[0])){found+=1; totalFound+=1;}
                        });
                        cell.setAttribute('data-wordCount', wList.length);
                        cell.setAttribute('data-foundWords', found);
                        let cl = 'none-found';
                        if(found > 0){ if(found == wList.length){cl = 'all-found';} else {cl = 'some-found';}}
                        cell.setAttribute('class', cl);
                        count += wList.length;
                    } else {
                        cell.appendChild(document.createTextNode("—"));
                        cell.setAttribute('class', 'no-words');
                    }
                    gridRow.appendChild(cell);
                });
                const rowTotal = document.createElement('th');
                rowTotal.setAttribute('data-'+letter+'Total', count);
                rowTotal.setAttribute('data-'+letter+'Found', totalFound);
                let cl = 'none-found';
                if(totalFound > 0){ if(totalFound == count){cl = 'all-found';} else {cl = 'some-found';}}
                rowTotal.setAttribute('class',cl);
                rowTotal.appendChild(document.createTextNode(count.toString()));
                gridRow.appendChild(rowTotal);
                gridElement.appendChild(gridRow);
            });
            const gridTotalRow = document.createElement('tr');
            let cell = document.createElement('th');
            cell.appendChild(document.createTextNode('Σ'));
            gridTotalRow.appendChild(cell);
            numbers.forEach((number) => {
                const cell = document.createElement('th');
                let count = this.answers.filter((answer) => answer.length == number).length;
                let foundCount = this.foundAnswers.filter((answer) => answer.length == number).length;
                let cl = 'none-found';
                if(foundCount > 0){ if(foundCount == count){cl = 'all-found';} else {cl = 'some-found';}}
                cell.setAttribute('class',cl);
                if(count > 0){
                    cell.appendChild(document.createTextNode(number.toString()));
                } else {
                    cell.appendChild(document.createTextNode("-"));
                }
                gridTotalRow.appendChild(cell);
            });
            cell = document.createElement('th');
            cell.appendChild(document.createTextNode(this.answers.length.toString()));
            gridTotalRow.appendChild(cell);
            gridElement.appendChild(gridTotalRow);
        }
        updateTwoLetterList(){
            this.buildTwoLetterList();
            const listElement = document.getElementById('waggle-list');
            listElement.textContent = '';
            for (const [letter, letterList] of Object.entries(this.twoLetterObject)) {
                const row = document.createElement('tr');
                let totalFound = 0;
                let count = 0;
                for(const [twoLetter, twoLetterList] of Object.entries(letterList)){
                    const cell = document.createElement('td');
                    cell.appendChild(document.createTextNode(twoLetter + '-' + twoLetterList.length.toString()));
                    let found = 0;
                    twoLetterList.forEach((word) => {
                        if(this.foundAnswers.includes(Object.keys(word)[0])){found+=1; totalFound+=1;}
                    });
                    cell.setAttribute('data-wordCount', twoLetterList.length);
                    cell.setAttribute('data-foundWords', found);
                    let cl = 'none-found';
                    if(found > 0){ if(found == twoLetterList.length){cl = 'all-found';} else {cl = 'some-found';}}
                    cell.setAttribute('class', cl);
                    count += twoLetterList.length;
                    row.appendChild(cell);
                }
                let cl = 'none-found';
                if(totalFound > 0){ if(totalFound == count){cl = 'all-found';} else {cl = 'some-found';}}
                row.setAttribute('class',cl);
                listElement.appendChild(row);
            }
        }
        updateFactList(){
            const wordCountElement = document.getElementById("waggle-word-count");
            const wordsFoundElement = document.getElementById("waggle-found-count");
            wordCountElement.textContent = this.answerCount;
            wordsFoundElement.textContent = this.foundAnswers.length.toString() + '/';
            const pointCountElement = document.getElementById("waggle-point-count");
            const pointsEarnedElement = document.getElementById("waggle-points-earned");
            pointCountElement.textContent = this.maxPoints.toString();
            pointsEarnedElement.textContent = this.currentScore.toString() + '/';
            const pangramsElement = document.getElementById("waggle-pangrams");
            const bingoElement = document.getElementById("waggle-bingo");
            let perfect = '';
            if(this.perfectPangramCount > 0){
                perfect = " (" + this.perfectPangramCount.toString() + " Perfect)";
            }
            pangramsElement.textContent = ', PANGRAMS: ' + this.foundPangrams.length.toString() + '/' + this.pangramCount.toString() + perfect;
            if(this.bingo == true) {
                bingoElement.textContent = " BINGO";
            }
        }
    }
    function waggleToggle(){
        document.getElementById('js-hook-game-wrapper').classList.toggle('waggle-show');
    }
    function buildWaggleBotContainers(){
        /* The Button */
        const button = document.createElement('span');
        button.setAttribute("id","waggle-button");
        button.setAttribute("class","pz-toolbar-button");
        button.setAttribute("role","presentation");
        button.appendChild(document.createTextNode("Wagglebot"));
        const buttonTarget = document.getElementsByClassName('pz-toolbar-button__stats')[0];
        const buttonParent = buttonTarget.parentNode;
        buttonParent.insertBefore(button, buttonTarget);
        document.getElementById('waggle-button').addEventListener("click", waggleToggle);
        /* The Container */
        const container = document.createElement('div');
        container.setAttribute("id","waggle-bot");
        // Adding it here and doing the grid shift because it locks up the game when I touch other areas.
        const target = document.getElementById('portal-editorial-content');
        const parent = target.parentNode;
        parent.insertBefore(container, target);
        /* Styling */
        const styling = document.createElement('style');
        styling.type = 'text/css';
        styling.appendChild(document.createTextNode(stylesheet));
        document.getElementsByTagName("head")[0].appendChild(styling);
        /* The Top */
        const intro = document.createElement('div');
        intro.setAttribute('id',"waggle-greetings");
        const header = document.createElement('h2');
        const greetings = document.createElement('p');
        header.appendChild(document.createTextNode(headerText));
        greetings.appendChild(document.createTextNode(greetingText));
        intro.appendChild(header);
        intro.appendChild(greetings);
        container.appendChild(intro);
        /* The Facts */
        const factsWrapper = document.createElement('div');
        factsWrapper.setAttribute("id","waggle-facts-wrapper");
        factsWrapper.appendChild(document.createTextNode("WORDS: "));
        const wordCount = document.createElement('span');
        wordCount.setAttribute("id","waggle-word-count");
        const wordsFound = document.createElement('span');
        wordsFound.setAttribute("id","waggle-found-count");
        factsWrapper.appendChild(wordsFound);
        factsWrapper.appendChild(wordCount);
        factsWrapper.appendChild(document.createTextNode(', POINTS: '));
        const pointCount = document.createElement('span');
        pointCount.setAttribute("id", "waggle-point-count");
        const pointsEarned = document.createElement('span');
        pointsEarned.setAttribute("id", "waggle-points-earned");
        factsWrapper.appendChild(pointsEarned);
        factsWrapper.appendChild(pointCount);
        const pangrams = document.createElement('span');
        pangrams.setAttribute("id", "waggle-pangrams");
        factsWrapper.appendChild(pangrams);
        const bingo = document.createElement('span');
        bingo.setAttribute("id", "waggle-bingo");
        factsWrapper.appendChild(bingo);
        container.appendChild(factsWrapper);
        /* The Grid */
        const gridWrapper = document.createElement('div');
        gridWrapper.setAttribute("id","waggle-grid-wrapper");
        const grid = document.createElement('table');
        grid.setAttribute("id","waggle-grid");
        gridWrapper.appendChild(grid);
        container.appendChild(gridWrapper);
        /* Two-letter List */
        const twoWrapper = document.createElement('div');
        twoWrapper.setAttribute("id","waggle-two-wrapper");
        const listHeader = document.createElement('h3');
        listHeader.appendChild(document.createTextNode("Two letter list:"));
        twoWrapper.appendChild(listHeader);
        const list = document.createElement('table');
        list.setAttribute("id","waggle-list");
        twoWrapper.appendChild(list);
        container.appendChild(twoWrapper);
    }
    buildWaggleBotContainers();
    const waggle = new Wagglebot(window.gameData);
    waggle.updateGrid();
    waggle.updateTwoLetterList();

})();

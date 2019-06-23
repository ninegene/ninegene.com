---
title: Bash
date: 2019-06-23 04:02:51
tags: bash
---

## Basic
#### Command sequence is delimited by using a semicolon
```bash
$ cmd1; cmd2

Same as below
$ cmd1
$ cmd2
```

### Get bash script directory
```bash
BASE_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
```

## Printing

#### Printing with `echo`
```bash
$ echo 'single qoute $HOME'
single qoute $HOME

$ echo "double qoute $HOME"
double qoute /home/myname

$ echo "newline:\n hello"
newline:\n hello

$ echo -e "newline:\n hello"
newline:
 hello
```

#### `echo` color
Colors are represented by color codes, some examples being, 
reset = 0, black = 30, red = 31, green = 32, yellow = 33, blue = 34, magenta = 35, cyan = 36, and white = 37.
```bash
echo -e "\e[1;31m This is red text \e[0m"
echo -e "\e[1;42m Green Background \e[0m"
```
Here, `\e[1;31m` is the escape string that sets the color to red and `\e[0m` resets the color back. Replace 31 with the required color code.

#### Printing with `printf`
todo

## Basic Arithmetic
#### Math with the shell
The Bash shell environment can perform basic arithmetic operations using the commands `let`, `(( ))`, and `[]`. The two utilities `expr` and `bc` are also very helpful in performing advanced operations.
```bash
#!/bin/bash
# Store as string
no1=4
no2=5

# String concatenation
result=$no1+$no2
echo $result  # Will output "4+5"

# Addition
# Without $ for no1 and no2 and without spaces around = and +
let result=no1+no2
let no1++
let no1+=1
let no1--
let no1-=1

# Addition - same as let
result=$[ no1 + no2 ]

result=$(( no1 + no2 ))

result=$(expr $no1 + $no2)

echo "4 #### 2" | bc

# 2 decimal place with scale
echo "scale=2; 3/8" | bc

```

## Function

#### Function defination
```bash
function fname() {
    statements;
}

# OR

fname() {
    statements;
}
```

#### Function arguments
```bash
fname() {
  echo $1 $2 $3 # arg1 and arg2
  echo "$#"     # Number of arguments
  echo "$@"     # Expand as "$1" "$2" "$3" etc.
  echo "$*"     # Expand as "$1c$2c$3" where c is the first character of `IFS`
  return 0      # Return value
}
```

#### Fork bomb `:(){ :|:& };:` - a recursive function; a function that calls itself
```bash
:() { 
    : | :& 
}

:
```

#### Exporting functions
```bash
export -f fname
```

#### Command exit status - `$?`
```bash
$ command
$ echo $?
```

```bash
$ cat test.sh
#!/bin/bash
CMD=$1
$CMD
if [ $? -eq 0 ];
then
    echo "$CMD executed successfully"
else
    echo "$CMD terminated unsuccessfully"
fi

$ bash test.sh ls
ls executed successfully

$ bash test.sh invalid-command
test.sh: line 3: invalid-command: command not found
invalid-command terminated unsuccessfully
```

## Array

#### Define Array
```bash
array_var=(test1 test2 test3)

OR

array_var[0]="test1"
array_var[1]="test2"
array_var[2]="test3"
```

#### Access array at a given index
```bash
echo ${array_var[0]}
test1

index=2
echo ${array_var[$index]}
test3
```

#### Get all values in array
```bash
echo ${array_var[*]}
test1 test2 test3

OR

echo ${array_var[@]}
test1 test2 test3
```

#### Get the length of the array
```bash
echo ${#array_var[*]}
2
```

#### Define associative array - can use any text as index
```bash
declare -A ass_array
ass_array=([myindex1]=myval1 [myindex2]=myval2)

OR

declare -A ass_array
ass_array[myindex1]=myval1
ass_array[myindex2]=myval2
```

#### Get array indexes 
```bash
echo ${!array_var[*]}
0 1 2

echo ${!ass_array[*]}
myindex1 myindex2
```

## Also see
- [Bash scripting cheatsheet](https://devhints.io/bash)
- [bash - awesome-cheatsheets](https://github.com/LeCoupa/awesome-cheatsheets/blob/master/languages/bash.sh)

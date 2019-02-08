# Your name: Wendy Wellesley
# Your username: wwellesl
# CS111 PS01 Task 1
# debugNumsFixed.py
# Submission date: 2018/02/06

###############################################################################
# CS111 PS01 Task 1
# 
# Initially, this file contains the buggy contents of Bud Lojack's 
# debugNumsBuggy.py file. 
# 
# Your task is to modify this file by finding and fixing as many bugs 
# bugs as you can find. 
# 
# You should summarize all bugs and their fixes by assigning variables
# named bug1, fix1, bug2, fix2 at the end of this file, as explained 
# in the Task 1 description. 
#
###############################################################################

# Tests involving an integer
intNum = int(input('Enter a nonnegative integer intNum: '))
print('The integer you entered is ' + str(intNum))
print('Three times intNum is', intNum * 3)
print(intNum, 'concatenated copies of X is', intNum*'X')
print('The integer remainder of',  intNum, 'divided by 3 is', + intNum%3)
print('The integer quotient of', intNum, 'divided by 3 is', intNum//3)
print(
  'The floating point quotient of', intNum,
  'divided by 3 is', intNum/3
)
print('The number of digits in', intNum, 'is', len(str(intNum)))

# Tests involving an floating point number
floatNum = float(input('Enter a floating point number floatNum: '))
print('floatNum is ' + str(floatNum))
print(str(floatNum) +  ' rounded to two places is ' + str(round(floatNum,2)))
print(floatNum, 'truncated to an integer is', int(floatNum))
print(floatNum, 'rounded to an integer is', round(floatNum))
print('')
print('The maximum of', intNum, 'and', floatNum, 'is', max(intNum, floatNum))

###############################################################################
# Below, summarize your bug fixes using variables named bug1, fix1,
# bug2, fix2, etc. that are assigned to triple-quoted strings,
# as explained in the Task1 description.
###############################################################################

###############################################################################
# Note: 
# This solution uses int(input(...)) on line 5 and float(input(...)) on line 18
# to guarantee that intNum contains an integer (as opposed to a string with
# digits) and floatName contains a float (as opposed to a string with digits
# and a decimal point). This changes the nature of the bugs that occur in the
# other lines. 
###############################################################################

bug1 = '''Line 6 prints the characters in the string "intNum" rather than 
          the digits of the number string in the variable named intNum.'''

fix1 = '''Change the printed string to be the result of concatenating
          'The integer you entered is ' with str(intNum). Using str(...)
          is necessary because in this solution, intNum contains an integer, 
          not a string.'''

bug2 = '''In line 7, the expression intNum * 3 multiplies the string contents 
          of the variable intNum by 3, resulting in the 3-fold concatenation 
          of that string. E.g., if intNum contains '17', the result of 
          intNum * 3 is the string '171717' '''

fix2 = '''The fix chosen here is to change line 5 to begin 
          intNum = int(input(...)), so that intNum contains an integer 
          rather than a string of digits.'''

bug3 = '''In line 8, intNum + 'X' attempts to concatenate the integer in the 
          variable intNum with 'X'. E.g., if intNum contains 17, this leads to 
          a type error in the + operation. What is really desired here is the 
          * operation, not the + operation.'''

fix3 = '''Change + to *.'''

bug4 = '''In line 10, int(intNum/3) attempts to first divide the string of
          digits in intNum by 3, but this is a type error.'''

fix4 = '''The change to line 5 that fixes Bug 3 also fixes the bug in line 10,
          except that integer division '//' is needed instead of regular
          division.'''

bug5 = '''In line 13, int(intNum)//3 performs integer division instead of
          floating point division.'''

fix5 = '''Change int(intNum)//3 to intNum/3.'''

bug6 = '''In line 15, len is called on the integer int(intNum), which is a 
          type error. len makes sense on strings, but not integers.'''

fix6 = '''Change len(int(intNum)) to len(str(intNum)). This finds the length 
          of the string of digits in intNum.'''

bug7 = '''Because of the decision to store a float in floatNum in line 18,
          line 19 has *two* bugs:
          (1) Concatenating the string 'floatNum is ' with the float floatNum
              is a type error
          (2) The string is not displayed via print.'''

fix7 = '''(1) change floatNum to str(floatNum) so that two strings are 
          concatenated.
          (2) wrap print(...) around the string resulting from concatenation.'''

bug8 = '''line 20, the round(...) expression returns the correct rounded 
          floating point number, but the + operator encounters a type error 
          when given a string and a number. In this case, it needs to be given 
          two strings.'''

fix8 = '''Wrap the floating point number resulting from round(...) in 
          str(...), so that two strings are being concatenated. 
          Note that in this version, float(floatNum) can be replaced by 
          floatNum.'''

bug9 = '''In line 21, int fails when applied to a string containing a decimal 
          point.'''

fix9 = '''The change assumed to line 18, which stores a float in the variable 
          floatNum, fixes this problem.'''

bug10 = '''In line 22 round must be called on a floating point number, not a
           string.'''

fix10 = '''This is already fixed by the change to line 18, which stores a float
           in floatNum.'''

bug11 = '''Between lines 22 and 23, there is no code that prints a blank line 
           before the final output line of the program.'''

fix11 = '''Between these two lines, add a new line with print(''), which will 
           display the missing blank line.'''

bug12 = '''In line 23 of Bud's program, max(intNum, floatNum) returns the max 
           of two *strings*, not two *numbers*. In Python, the max of two 
           strings is the one that is later in dicionary order. 
           So max('17', '143.816') returns '17', because '17' comes after any 
           string beginning with '14' in dictionary order.'''

fix12 = '''The changes assumed to line 5, which stores an int in the variable 
           intNum, and line 18, which stores a float in the variable floatNum, 
           fix this problem.'''
